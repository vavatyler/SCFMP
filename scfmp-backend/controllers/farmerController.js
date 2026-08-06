const { Farmer, Member } = require('../models');

/**
 * Helper: loads the farmer's parent member and checks the caller
 * is allowed to touch it (same cooperative, or super_admin).
 */
const assertAccessToFarmer = async (farmer, user) => {
  const member = farmer.member || (await Member.findByPk(farmer.member_id));
  if (user.role !== 'super_admin' && member.cooperative_id !== user.cooperative_id) {
    return false;
  }
  return true;
};

const list = async (req, res) => {
  try {
    const memberWhere = {};
    if (req.user.role !== 'super_admin') {
      memberWhere.cooperative_id = req.user.cooperative_id;
    } else if (req.query.cooperative_id) {
      memberWhere.cooperative_id = req.query.cooperative_id;
    }

    const farmers = await Farmer.findAll({
      include: [{ model: Member, as: 'member', where: memberWhere }],
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({ success: true, data: farmers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const farmer = await Farmer.findByPk(req.params.id, {
      include: [{ model: Member, as: 'member' }],
    });
    if (!farmer) return res.status(404).json({ success: false, message: 'Farmer not found' });

    if (!(await assertAccessToFarmer(farmer, req.user))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.status(200).json({ success: true, data: farmer });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/farmers
 * Body must include member_id — a farmer profile always extends an existing member.
 */
const create = async (req, res) => {
  try {
    const { member_id, farm_size_ha, location, gps_coordinates, crop_type } = req.body;

    if (!member_id) {
      return res.status(400).json({ success: false, message: 'member_id is required' });
    }

    const member = await Member.findByPk(member_id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    if (req.user.role !== 'super_admin' && member.cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const existing = await Farmer.findOne({ where: { member_id } });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: 'This member already has a farmer profile' });
    }

    const farmer = await Farmer.create({
      member_id,
      farm_size_ha,
      location,
      gps_coordinates,
      crop_type,
    });

    return res.status(201).json({ success: true, data: farmer });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const farmer = await Farmer.findByPk(req.params.id, {
      include: [{ model: Member, as: 'member' }],
    });
    if (!farmer) return res.status(404).json({ success: false, message: 'Farmer not found' });

    if (!(await assertAccessToFarmer(farmer, req.user))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { member_id, ...safeUpdates } = req.body; // member_id is immutable after creation
    await farmer.update(safeUpdates);

    return res.status(200).json({ success: true, data: farmer });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const farmer = await Farmer.findByPk(req.params.id, {
      include: [{ model: Member, as: 'member' }],
    });
    if (!farmer) return res.status(404).json({ success: false, message: 'Farmer not found' });

    if (!(await assertAccessToFarmer(farmer, req.user))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await farmer.destroy();
    return res.status(200).json({ success: true, message: 'Farmer profile deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { list, getById, create, update, remove };
