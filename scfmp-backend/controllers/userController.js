const { User, Cooperative } = require('../models');

/**
 * GET /api/users
 * super_admin: sees everyone, optionally filtered by ?cooperative_id=
 * cooperative_manager: sees only their own cooperative's staff
 */
const list = async (req, res) => {
  try {
    const where = {};

    if (req.user.role !== 'super_admin') {
      where.cooperative_id = req.user.cooperative_id;
    } else if (req.query.cooperative_id) {
      where.cooperative_id = req.query.cooperative_id;
    }
    if (req.query.role) where.role = req.query.role;

    const users = await User.findAll({
      where,
      include: [{ model: Cooperative, as: 'cooperative', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({ success: true, data: users });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/users/:id/status
 * Activate or deactivate a user account (super_admin or that cooperative's manager).
 */
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be active or inactive' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (req.user.role !== 'super_admin' && user.cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (user.id === req.user.id) {
      return res.status(400).json({ success: false, message: "You can't deactivate your own account" });
    }

    user.status = status;
    await user.save();

    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/users/:id/reset-password
 * super_admin or that cooperative's manager sets a new password for a staff account
 * (e.g. when someone forgets their password). No knowledge of the old password needed —
 * that's what distinguishes this from the self-service /auth/change-password.
 */
const resetPassword = async (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      return res
        .status(400)
        .json({ success: false, message: 'new_password must be at least 6 characters' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (req.user.role !== 'super_admin' && user.cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    user.password_hash = new_password; // re-hashed automatically by the model's beforeUpdate hook
    await user.save();

    return res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { list, updateStatus, resetPassword };
