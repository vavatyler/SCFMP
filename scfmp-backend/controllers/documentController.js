const { Op } = require('sequelize');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const { Document, Cooperative, Member, Farmer, Loan, User } = require('../models');
const { recordAuditEvent } = require('../services/auditService');
const {
  getDocumentClassification,
  isValidDocumentClassification,
  normalizeOrganizationType,
} = require('../config/documentClassification');
const {
  isBlobLocation,
  saveUploadedFile,
  openStoredFile,
  removeStoredFile,
  unlinkIfPresent,
  STORAGE_ERROR_CODES,
} = require('../services/documentStorageService');

const EXPIRING_SOON_DAYS = Math.max(1, Number.parseInt(process.env.DOCUMENT_EXPIRING_SOON_DAYS, 10) || 30);

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
  if (document.visibility === 'restricted' && user.role !== 'cooperative_manager') return false;
  if (user.role !== 'farmer') return true;
  const { memberId, farmerId, loanIds } = await getFarmerOwnerIds(user.id);
  return (
    (document.owner_type === 'member' && document.owner_id === memberId)
    || (document.owner_type === 'farmer' && document.owner_id === farmerId)
    || (document.owner_type === 'loan' && loanIds.includes(document.owner_id))
  );
};

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getExpiryStatus = (document) => {
  if (document.archived_at) return 'archived';
  if (!document.expiry_date) return 'active';
  const expiry = new Date(`${document.expiry_date}T00:00:00`);
  const today = startOfToday();
  if (expiry < today) return 'expired';
  if (expiry <= addDays(today, EXPIRING_SOON_DAYS)) return 'expiring_soon';
  return 'active';
};

const serializeDocument = (document) => {
  const value = typeof document.toJSON === 'function' ? document.toJSON() : { ...document };
  return { ...value, document_status: getExpiryStatus(value) };
};

const baseWhereForUser = async (req) => {
  const where = {};
  if (req.user.role !== 'super_admin') where.cooperative_id = req.user.cooperative_id;
  else if (req.query.cooperative_id) where.cooperative_id = Number(req.query.cooperative_id);
  if (!['super_admin', 'cooperative_manager'].includes(req.user.role)) where.visibility = 'organization';
  if (req.user.role === 'farmer') {
    Object.assign(where, farmerDocumentWhere(await getFarmerOwnerIds(req.user.id)));
  }
  return where;
};

const list = async (req, res) => {
  try {
    const where = await baseWhereForUser(req);
    const {
      owner_type,
      owner_id,
      category,
      document_type,
      document_date,
      expiry_date,
      uploaded_by,
      status,
      search,
    } = req.query;
    if (owner_type) where.owner_type = owner_type;
    if (owner_id) where.owner_id = Number(owner_id);
    if (category) where.category = category;
    if (document_type) where.document_type = document_type;
    if (document_date) where.document_date = document_date;
    if (expiry_date) where.expiry_date = expiry_date;
    if (uploaded_by) where.uploaded_by = Number(uploaded_by);
    if (search) {
      where[Op.and] = [
        ...(where[Op.and] || []),
        { [Op.or]: [
          { title: { [Op.like]: `%${search}%` } },
          { original_name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { tags: { [Op.like]: `%${search}%` } },
        ] },
      ];
    }
    const today = startOfToday();
    if (status === 'archived') where.archived_at = { [Op.ne]: null };
    else {
      where.archived_at = null;
      if (status === 'expired') where.expiry_date = { [Op.lt]: today };
      if (status === 'expiring_soon') {
        where.expiry_date = { [Op.between]: [today, addDays(today, EXPIRING_SOON_DAYS)] };
      }
      if (status === 'active') {
        where[Op.and] = [
          ...(where[Op.and] || []),
          { [Op.or]: [{ expiry_date: null }, { expiry_date: { [Op.gt]: addDays(today, EXPIRING_SOON_DAYS) } }] },
        ];
      }
    }

    const documents = await Document.findAll({
      where,
      include: [
        { model: Cooperative, as: 'cooperative', attributes: ['id', 'name', 'organization_type'] },
        { model: User, as: 'uploadedByUser', attributes: ['id', 'first_name', 'last_name'] },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.status(200).json({
      success: true,
      data: documents.map(serializeDocument),
      meta: { expiring_soon_days: EXPIRING_SOON_DAYS },
    });
  } catch (err) {
    console.error('Document list failed:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to load documents right now' });
  }
};

const resolveClassificationOrganization = async (cooperativeId) => {
  const cooperative = await Cooperative.findByPk(cooperativeId);
  return cooperative || { id: cooperativeId, organization_type: 'other' };
};

const validateClassification = async (cooperativeId, category, documentType) => {
  const organization = await resolveClassificationOrganization(cooperativeId);
  const organizationType = normalizeOrganizationType(organization.organization_type);
  if (!isValidDocumentClassification(organizationType, category, documentType)) {
    throw Object.assign(
      new Error('Document category and type are not valid for this organization type'),
      { status: 400, code: 'DOCUMENT_CLASSIFICATION_INVALID' }
    );
  }
  return organization;
};

const cleanMetadata = (body, fallbackTitle) => ({
  title: String(body.title || fallbackTitle || '').trim(),
  category: String(body.category || 'other').trim(),
  document_type: String(body.document_type || 'other').trim(),
  description: String(body.description || '').trim() || null,
  document_date: body.document_date || null,
  expiry_date: body.expiry_date || null,
  version: String(body.version || '').trim() || null,
  tags: String(body.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean).join(', ') || null,
  visibility: body.visibility || 'organization',
  notes: String(body.notes || '').trim() || null,
});

const validateMetadataDates = (metadata) => {
  if (metadata.document_date && metadata.expiry_date && metadata.expiry_date < metadata.document_date) {
    throw Object.assign(new Error('Expiry date cannot be before the document date'), {
      status: 400,
      code: 'DOCUMENT_DATE_RANGE_INVALID',
    });
  }
};

const canSetRestrictedVisibility = (user) => (
  ['super_admin', 'cooperative_manager'].includes(user.role)
);

const upload = async (req, res) => {
  let storedFile;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, code: 'DOCUMENT_FILE_REQUIRED', message: 'No file was uploaded' });
    }
    const { owner_type, owner_id } = req.body;
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
    const metadata = cleanMetadata(req.body, req.file.originalname);
    validateMetadataDates(metadata);
    if (metadata.visibility === 'restricted' && !canSetRestrictedVisibility(req.user)) {
      throw Object.assign(new Error('Only managers can create restricted documents'), { status: 403 });
    }
    if (!metadata.title) {
      await unlinkIfPresent(req.file.path);
      return res.status(400).json({ success: false, message: 'Document title is required' });
    }
    await validateClassification(ownerCooperativeId, metadata.category, metadata.document_type);
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
      ...metadata,
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
    return res.status(201).json({ success: true, data: serializeDocument(document) });
  } catch (err) {
    if (storedFile) {
      try { await removeStoredFile({ file_path: storedFile.filePath }); } catch (cleanupError) {
        console.error('Uploaded document cleanup failed:', cleanupError.message);
      }
    } else if (req.file) {
      await unlinkIfPresent(req.file.path);
    }
    console.error('Document upload failed:', err.cause?.message || err.message);
    if (err.code === STORAGE_ERROR_CODES.unavailable) {
      return res.status(503).json({ success: false, code: err.code, message: err.message });
    }
    if (err.code === STORAGE_ERROR_CODES.uploadFailed) {
      return res.status(502).json({ success: false, code: err.code, message: err.message });
    }
    return res.status(err.status || 500).json({
      success: false,
      code: err.code || 'DOCUMENT_METADATA_SAVE_FAILED',
      message: err.status ? err.message : 'Unable to upload the document right now',
    });
  }
};

const updateMetadata = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });
    if (!(await canAccessDocument(document, req.user))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const metadata = cleanMetadata({ ...document.toJSON(), ...req.body }, document.original_name);
    validateMetadataDates(metadata);
    if (metadata.visibility === 'restricted' && !canSetRestrictedVisibility(req.user)) {
      throw Object.assign(new Error('Only managers can restrict document visibility'), { status: 403 });
    }
    if (!metadata.title) return res.status(400).json({ success: false, message: 'Document title is required' });
    await validateClassification(document.cooperative_id, metadata.category, metadata.document_type);
    await document.update(metadata);
    await recordAuditEvent({
      req,
      actor: req.user,
      action: 'document.metadata_updated',
      entityType: 'document',
      entityId: document.id,
      metadata: { cooperative_id: document.cooperative_id, changed_fields: Object.keys(req.body) },
    });
    return res.status(200).json({ success: true, data: serializeDocument(document) });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, code: err.code, message: err.message });
  }
};

const replaceFile = async (req, res) => {
  let storedFile;
  try {
    if (!req.file) return res.status(400).json({ success: false, code: 'DOCUMENT_FILE_REQUIRED', message: 'No file was uploaded' });
    const document = await Document.findByPk(req.params.id);
    if (!document) {
      await unlinkIfPresent(req.file.path);
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    if (!(await canAccessDocument(document, req.user))) {
      await unlinkIfPresent(req.file.path);
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    storedFile = await saveUploadedFile(req.file, {
      cooperativeId: document.cooperative_id,
      ownerType: document.owner_type,
      ownerId: document.owner_id,
    });
    const previousFile = { file_path: document.file_path };
    await document.update({
      original_name: req.file.originalname,
      stored_name: storedFile.storedName,
      file_path: storedFile.filePath,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
    });
    storedFile = null;
    try { await removeStoredFile(previousFile); } catch (cleanupError) {
      console.error('Previous document cleanup failed:', cleanupError.message);
    }
    await recordAuditEvent({
      req,
      actor: req.user,
      action: 'document.file_replaced',
      entityType: 'document',
      entityId: document.id,
      metadata: { cooperative_id: document.cooperative_id },
    });
    return res.status(200).json({ success: true, data: serializeDocument(document) });
  } catch (err) {
    if (storedFile) {
      try { await removeStoredFile({ file_path: storedFile.filePath }); } catch (cleanupError) {
        console.error('Replacement document cleanup failed:', cleanupError.message);
      }
    } else if (req.file) {
      await unlinkIfPresent(req.file.path);
    }
    if (err.code === STORAGE_ERROR_CODES.unavailable) {
      return res.status(503).json({ success: false, code: err.code, message: err.message });
    }
    return res.status(500).json({ success: false, message: 'Unable to replace the document file right now' });
  }
};

const setArchived = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });
    if (!(await canAccessDocument(document, req.user))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    await document.update({ archived_at: req.body.archived ? new Date() : null });
    await recordAuditEvent({
      req,
      actor: req.user,
      action: req.body.archived ? 'document.archived' : 'document.restored',
      entityType: 'document',
      entityId: document.id,
      metadata: { cooperative_id: document.cooperative_id },
    });
    return res.status(200).json({ success: true, data: serializeDocument(document) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Unable to update document status right now' });
  }
};

const classification = async (req, res) => {
  try {
    const cooperativeId = req.user.role === 'super_admin'
      ? Number(req.query.cooperative_id || 0) || null
      : req.user.cooperative_id;
    if (!cooperativeId) {
      return res.status(400).json({ success: false, message: 'Select an organization first' });
    }
    const cooperative = await Cooperative.findByPk(cooperativeId);
    if (!cooperative) return res.status(404).json({ success: false, message: 'Organization not found' });
    const organizationType = normalizeOrganizationType(cooperative.organization_type);
    return res.status(200).json({
      success: true,
      data: {
        organization_id: cooperative.id,
        organization_type: organizationType,
        categories: getDocumentClassification(organizationType),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const stats = async (req, res) => {
  try {
    const where = await baseWhereForUser(req);
    const documents = await Document.findAll({ where, attributes: ['id', 'category', 'expiry_date', 'archived_at'] });
    const values = documents.map(serializeDocument);
    return res.status(200).json({
      success: true,
      data: {
        total: values.length,
        meetings: values.filter((item) => item.category === 'meetings').length,
        legal: values.filter((item) => item.category === 'legal' || item.category === 'registration').length,
        financial: values.filter((item) => item.category === 'finance').length,
        expiring_soon: values.filter((item) => item.document_status === 'expiring_soon').length,
      },
      meta: { expiring_soon_days: EXPIRING_SOON_DAYS },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Unable to load document statistics right now' });
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
      if (req.query.disposition === 'inline') {
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.original_name)}"`);
      } else {
        res.attachment(document.original_name);
      }
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
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

module.exports = {
  list,
  upload,
  updateMetadata,
  replaceFile,
  setArchived,
  classification,
  stats,
  download,
  remove,
};
