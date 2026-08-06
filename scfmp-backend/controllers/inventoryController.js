const { Op } = require('sequelize');
const { InventoryItem, InventoryTransaction, User, Notification, sequelize } = require('../models');

const resolveCooperativeScope = (req) => {
  if (req.user.role === 'super_admin') {
    return req.query.cooperative_id || req.body.cooperative_id || null;
  }
  return req.user.cooperative_id;
};

/**
 * GET /api/inventory
 */
const listItems = async (req, res) => {
  try {
    const cooperativeId = resolveCooperativeScope(req);
    const where = {};
    if (cooperativeId) where.cooperative_id = cooperativeId;
    if (req.query.category) where.category = req.query.category;

    const items = await InventoryItem.findAll({ where, order: [['item_name', 'ASC']] });
    return res.status(200).json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/inventory/low-stock
 * Items at or below their reorder level — dashboard alert feed.
 */
const lowStock = async (req, res) => {
  try {
    const cooperativeId = resolveCooperativeScope(req);
    const where = {
      status: 'active',
      [Op.and]: sequelize.where(
        sequelize.col('quantity_in_stock'),
        Op.lte,
        sequelize.col('reorder_level')
      ),
    };
    if (cooperativeId) where.cooperative_id = cooperativeId;

    const items = await InventoryItem.findAll({ where, order: [['item_name', 'ASC']] });
    return res.status(200).json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getItemById = async (req, res) => {
  try {
    const item = await InventoryItem.findByPk(req.params.id, {
      include: [{ model: InventoryTransaction, as: 'movements' }],
    });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    if (req.user.role !== 'super_admin' && item.cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.status(200).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/inventory
 * Creates a new item. Starting stock is set via an optional initial "in" movement,
 * not typed directly — keeps every unit accounted for from day one.
 */
const createItem = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { item_name, category, unit, reorder_level, unit_cost, initial_quantity } = req.body;

    const cooperative_id =
      req.user.role === 'super_admin' ? req.body.cooperative_id : req.user.cooperative_id;
    if (!cooperative_id) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'cooperative_id is required' });
    }

    const item = await InventoryItem.create(
      {
        cooperative_id,
        item_name,
        category,
        unit,
        reorder_level: reorder_level || 0,
        unit_cost,
        quantity_in_stock: 0,
      },
      { transaction: t }
    );

    let openingMovement = null;
    if (initial_quantity && parseFloat(initial_quantity) > 0) {
      openingMovement = await InventoryTransaction.create(
        {
          item_id: item.id,
          type: 'in',
          quantity: initial_quantity,
          reference: 'Opening stock',
          transaction_date: new Date().toISOString().slice(0, 10),
          recorded_by: req.user.id,
        },
        { transaction: t }
      );
      item.quantity_in_stock = parseFloat(initial_quantity);
      await item.save({ transaction: t });
    }

    await t.commit();
    return res.status(201).json({ success: true, data: { item, openingMovement } });
  } catch (err) {
    await t.rollback();
    return res.status(500).json({ success: false, message: err.message });
  }
};

const updateItem = async (req, res) => {
  try {
    const item = await InventoryItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    if (req.user.role !== 'super_admin' && item.cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // quantity_in_stock is never edited directly — only via /movements
    const { cooperative_id, quantity_in_stock, ...safeUpdates } = req.body;
    await item.update(safeUpdates);

    return res.status(200).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const removeItem = async (req, res) => {
  try {
    const item = await InventoryItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    if (req.user.role !== 'super_admin' && item.cooperative_id !== req.user.cooperative_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await item.destroy();
    return res.status(200).json({ success: true, message: 'Item deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/inventory/:itemId/movements
 * Records a stock movement AND updates the item's quantity_in_stock, atomically.
 * "out" movements are rejected if they would push stock below zero.
 */
const recordMovement = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { type, quantity, reference, transaction_date } = req.body;

    const item = await InventoryItem.findByPk(req.params.itemId, { transaction: t });
    if (!item) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    if (req.user.role !== 'super_admin' && item.cooperative_id !== req.user.cooperative_id) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const qty = parseFloat(quantity);
    const currentStock = parseFloat(item.quantity_in_stock);
    const newStock = type === 'in' ? currentStock + qty : currentStock - qty;

    if (type === 'out' && newStock < 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Not enough stock: only ${currentStock} ${item.unit} available`,
      });
    }

    const movement = await InventoryTransaction.create(
      {
        item_id: item.id,
        type,
        quantity: qty,
        reference,
        transaction_date,
        recorded_by: req.user.id,
      },
      { transaction: t }
    );

    item.quantity_in_stock = newStock;
    await item.save({ transaction: t });

    await t.commit();

    // Auto-alert: if this movement dropped stock to/below the reorder level, notify
    // the cooperative's managers. Done after commit and best-effort — a notification
    // failure should never undo a successful stock movement.
    if (type === 'out' && newStock <= parseFloat(item.reorder_level)) {
      try {
        const managers = await User.findAll({
          where: { cooperative_id: item.cooperative_id, role: 'cooperative_manager', status: 'active' },
        });
        await Promise.all(
          managers.map((manager) =>
            Notification.create({
              user_id: manager.id,
              title: 'Low stock alert',
              message: `${item.item_name} is running low: ${newStock} ${item.unit} remaining (reorder level: ${item.reorder_level} ${item.unit}).`,
              type: 'warning',
              related_entity_type: 'inventory_item',
              related_entity_id: item.id,
            })
          )
        );
      } catch (notifyErr) {
        console.error('Failed to send low-stock notification:', notifyErr.message);
      }
    }

    return res.status(201).json({ success: true, data: { item, movement } });
  } catch (err) {
    await t.rollback();
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  listItems,
  lowStock,
  getItemById,
  createItem,
  updateItem,
  removeItem,
  recordMovement,
};
