const fs = require('fs');
const { Document, Cooperative, Member, Farmer, Loan } = require('../models');

/**
 * Confirms owner_type/owner_id actually exists and belongs to the caller's cooperative.
 * Returns the resolved cooperative_id, or null if invalid.
 */
const resolveOwnerCooperativeId = async (owner_type, owner_id) => {
  switch (owner_type) {
    case 'cooperative': {
      const coop = await Cooperative.findByPk(owner_id);
      return coop ? coop.id : null;
    }
    case 'member': {
      const member = await Member.findByPk(owner_id);
      return member ? member.cooperative_id : null;
    }
    case 'farmer': {
      const farmer = await Farmer.findByPk(owner_id, { include: [{ model: Member, as: 'member' }] });
      return farmer ? farmer.member.cooperative_id : null;
    }
    case 'loan': {
      const loan = await Loan.findByPk(owner_id);
      return loan ? loan.cooperative_id : null;
    }
    default:
      return null;
  }
};

/**
 * GET /api/documents?owner_type=&owner_id=
 */
const list = async (req, res) => {
  try {
    const { owner_type, owner_id } = req.query;
    const where = {};

    if (req.user.role !== 'super_admin') {
      where.cooperative_id = req.user.cooperative_id;
    } else if (req.query.cooperative_id) {
      where.cooperative_id = req.query.cooperative_id;
    }
    if (owner_type) where.owner_type = owner_type;
    if (owner_id) where.owner_id = owner_id;

    const documents = await Document.findAll({ where, order: [['created_at', 'DESC']] });
    return res.status(200).json({ success: true, data: documents });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/documents
 * multipart/form-data with a "file" field, plus owner_type / owner_id / description in the body.
 */
const upload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file was uploaded' });
    }

    const { owner_type, owner_id, description } = req.body;
    if (!owner_type || !owner_id) {
      fs.unlinkSync(req.file.path); // clean up the orphaned upload
      return res.status(400).json({ success: false, message: 'owner_type and owner_id are required' });
    }

    const ownerCooperativeId = await resolveOwnerCooperativeId(owner_type, owner_id);
    if (!ownerCooperativeId) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'The specified owner was not found' });
    }
    if (req.user.role !== 'super_admin' && ownerCooperativeId !== req.user.cooperative_id) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const document = await Document.create({
      cooperative_id: ownerCooperativeId,
      owner_type,
      owner_id,
      original_name: req.file.originalname,
      stored_name: req.file.filename,
      file_path: req.file.path,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      description,
      uploaded_by: req.user.id,
    });

    return res.status(201).json({ success: true, data: document });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/documents/:id/download
 */
const download = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

    if (req.user.role !== 'super_admin' && document.cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (!fs.existsSync(document.file_path)) {
      return res.status(410).json({ success: false, message: 'File is missing from storage' });
    }

    return res.download(document.file_path, document.original_name);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

    if (req.user.role !== 'super_admin' && document.cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }
    await document.destroy();

    return res.status(200).json({ success: true, message: 'Document deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { list, upload, download, remove };
