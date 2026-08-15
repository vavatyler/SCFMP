const { Op } = require('sequelize');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const { Document, Cooperative, Member, Farmer, Loan } = require('../models');
const { recordAuditEvent } = require('../services/auditService');
const {
  isBlobLocation,
  saveUploadedFile,
  openStoredFile,
  removeStoredFile,
  unlinkIfPresent,
} = require('../services/documentStorageService');

const resolveOwnerCooperativeId = async (ownerType, ownerId) => {
  switch (ownerType) {
    case 'cooperative': {
      const cooperative = await Cooperative.findByPk(ownerId);
      return cooperative?.id || null;
    }
    case 'member': {
      const member = await Member.findByPk(ownerId);
      return member?.cooperative_id || null;
    }
    case 'farmer': {
      const farmer = await Farmer.findByPk(ownerId, {
        include: [{ model: Member, as: 'member', required: true }],
      });
      return farmer?.member?.cooperative_id || null;
    }
    case 'loan': {
      const loan = await Loan.findByPk(ownerId);
      return loan?.cooperative_id || null;
    }
    default:
      return null;
  }
};

const getFarmerOwnerIds = async (userId) => {
  const member = await Member.findOne({ where: { user_id: userId }, attributes: ['id'] });
  if (!member) return { memberId: -1, farmerId: -1, loanIds: [-1] };
  const [farmer, loans] = await Promise.all([
    Farmer.findOne({ where: { member_id: member.id }, attributes: ['id'] }),
    Loan.findAll({ where: { member_id: member.id }, attributes: ['id'] }),
  ]);
  return {
    memberId: member.id,
    farmerId: farmer?.id || -1,
    loanIds: loans.length ? loans.map((loan) => loan.id) : [-1],
  };
};

const farmerDocumentWhere = ({ memberId, farmerId, loanIds }) => ({
  [Op.or]: [
    { owner_type: 'member', owner_id: memberId },
    { owner_type: 'farmer', owner_id: farmerId },
    { owner_type: 'loan', owner_id: { [Op.in]: loanIds } },
  ],
});

const canAccessDocument = async (document, user) => {
  if (user.role === 'super_admin') return true;
  if (document.cooperative_id !== user.cooperative_id) return false;
  if (user.role !== 'farmer') return true;

  const { memberId, farmerId, loanIds } = await getFarmerOwnerIds(user.id);
  return (
    (document.owner_type === 'member' && document.owner_id === memberId)
    || (document.owner_type === 'farmer' && document.owner_id === farmerId)
    || (document.owner_type === 'loan' && loanIds.includes(document.owner_id))
  );
};

const list = async (req, res) => {
  try {
    const { owner_type, owner_id } = req.query;
    const where = {};

    if (req.user.role !== 'super_admin') where.cooperative_id = req.user.cooperative_id;
    else if (req.query.cooperative_id) where.cooperative_id = Number(req.query.cooperative_id);
    if (req.user.role === 'farmer') Object.assign(where, farmerDocumentWhere(await getFarmerOwnerIds(req.user.id)));
    if (owner_type) where.owner_type = owner_type;
    if (owner_id) where.owner_id = Number(owner_id);

    const documents = await Document.findAll({ where, order: [['created_at', 'DESC']] });
    return res.status(200).json({ success: true, data: documents });
  } catch (err) {
    console.error('Document list failed:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to load documents right now' });
  }
};

const upload = async (req, res) => {
  let storedFile;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file was uploaded' });

    const { owner_type, owner_id, description } = req.body;
    if (!owner_type || !owner_id) {
      await unlinkIfPresent(req.file.path);
      return res.status(400).json({ success: false, message: 'owner_type and owner_id are required' });
    }

    const ownerCooperativeId = await resolveOwnerCooperativeId(owner_type, owner_id);
    if (!ownerCooperativeId) {
      await unlinkIfPresent(req.file.path);
      return res.status(404).json({ success: false, message: 'The specified owner was not found' });
    }
    if (req.user.role !== 'super_admin' && ownerCooperativeId !== req.user.cooperative_id) {
      await unlinkIfPresent(req.file.path);
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    storedFile = await saveUploadedFile(req.file, {
      cooperativeId: ownerCooperativeId,
      ownerType: owner_type,
      ownerId: Number(owner_id),
    });
    const document = await Document.create({
      cooperative_id: ownerCooperativeId,
      owner_type,
      owner_id: Number(owner_id),
      original_name: req.file.originalname,
      stored_name: storedFile.storedName,
      file_path: storedFile.filePath,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      description,
      uploaded_by: req.user.id,
    });
    await recordAuditEvent({
      req,
      actor: req.user,
      action: 'document.uploaded',
      entityType: 'document',
      entityId: document.id,
      metadata: { cooperative_id: ownerCooperativeId, owner_type, owner_id: Number(owner_id) },
    });
    return res.status(201).json({ success: true, data: document });
  } catch (err) {
    if (storedFile) {
      try { await removeStoredFile({ file_path: storedFile.filePath }); } catch (cleanupError) {
        console.error('Uploaded document cleanup failed:', cleanupError.message);
      }
    } else if (req.file) {
      await unlinkIfPresent(req.file.path);
    }
    console.error('Document upload failed:', err.message);
    return res.status(500).json({ success: false, message: err.message.includes('Blob is not configured') ? err.message : 'Unable to upload the document right now' });
  }
};

const download = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });
    if (!(await canAccessDocument(document, req.user))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (isBlobLocation(document.file_path)) {
      const result = await openStoredFile(document.file_path);
      if (!result || result.statusCode !== 200) {
        return res.status(410).json({ success: false, message: 'File is missing from storage' });
      }
      res.type(document.mime_type || result.blob.contentType || 'application/octet-stream');
      res.attachment(document.original_name);
      res.setHeader('Content-Length', String(result.blob.size));
      await pipeline(Readable.fromWeb(result.stream), res);
      return undefined;
    }

    return res.download(document.file_path, document.original_name);
  } catch (err) {
    console.error('Document download failed:', err.message);
    if (res.headersSent) return res.end();
    return res.status(500).json({ success: false, message: 'Unable to download the document right now' });
  }
};

const remove = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });
    if (!(await canAccessDocument(document, req.user))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await removeStoredFile(document);
    await document.destroy();
    await recordAuditEvent({
      req,
      actor: req.user,
      action: 'document.deleted',
      entityType: 'document',
      entityId: document.id,
      metadata: { cooperative_id: document.cooperative_id, owner_type: document.owner_type, owner_id: document.owner_id },
    });
    return res.status(200).json({ success: true, message: 'Document deleted' });
  } catch (err) {
    console.error('Document deletion failed:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to delete the document right now' });
  }
};

module.exports = { list, upload, download, remove };
