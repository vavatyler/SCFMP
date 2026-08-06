const { Notification } = require('../models');

/**
 * GET /api/notifications
 * Always scoped to the logged-in user — nobody sees anyone else's notifications,
 * not even super_admin (each person only sees their own inbox).
 */
const list = async (req, res) => {
  try {
    const { unread_only, page = 1, limit = 20 } = req.query;
    const where = { user_id: req.user.id };
    if (unread_only === 'true') where.is_read = false;

    const offset = (Number(page) - 1) * Number(limit);

    const { rows, count } = await Notification.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset,
    });

    const unreadCount = await Notification.count({ where: { user_id: req.user.id, is_read: false } });

    return res.status(200).json({
      success: true,
      data: rows,
      unread_count: unreadCount,
      pagination: { total: count, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/notifications
 * For admins/managers to send an announcement to a specific user.
 * (System-triggered notifications — e.g. low stock — are created internally via
 * the same Notification.create() call from other controllers, not through this route.)
 */
const create = async (req, res) => {
  try {
    const { user_id, title, message, type } = req.body;

    const notification = await Notification.create({
      user_id,
      title,
      message,
      type: type || 'info',
    });

    return res.status(201).json({ success: true, data: notification });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/notifications/:id/read
 */
const markRead = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    if (notification.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    notification.is_read = true;
    await notification.save();

    return res.status(200).json({ success: true, data: notification });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/notifications/read-all
 */
const markAllRead = async (req, res) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.user.id, is_read: false } }
    );
    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    if (notification.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await notification.destroy();
    return res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { list, create, markRead, markAllRead, remove };
