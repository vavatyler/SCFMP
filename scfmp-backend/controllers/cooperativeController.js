const { Cooperative } = require('../models');

const list = async (req, res) => {
  try {
    const cooperatives = await Cooperative.findAll({ order: [['created_at', 'DESC']] });
    return res.status(200).json({ success: true, data: cooperatives });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const coop = await Cooperative.findByPk(req.params.id);
    if (!coop) return res.status(404).json({ success: false, message: 'Cooperative not found' });
    return res.status(200).json({ success: true, data: coop });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const coop = await Cooperative.create(req.body);
    return res.status(201).json({ success: true, data: coop });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const coop = await Cooperative.findByPk(req.params.id);
    if (!coop) return res.status(404).json({ success: false, message: 'Cooperative not found' });
    await coop.update(req.body);
    return res.status(200).json({ success: true, data: coop });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const coop = await Cooperative.findByPk(req.params.id);
    if (!coop) return res.status(404).json({ success: false, message: 'Cooperative not found' });
    await coop.destroy();
    return res.status(200).json({ success: true, message: 'Cooperative deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { list, getById, create, update, remove };
