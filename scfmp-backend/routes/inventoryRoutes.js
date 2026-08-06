const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  listItems,
  lowStock,
  getItemById,
  createItem,
  updateItem,
  removeItem,
  recordMovement,
} = require('../controllers/inventoryController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

router.use(verifyToken);

// IMPORTANT: /low-stock must be declared before /:id
router.get('/low-stock', lowStock);

router.get('/', listItems);
router.get('/:id', getItemById);

router.post(
  '/',
  checkRole('super_admin', 'cooperative_manager', 'field_officer'),
  [
    body('item_name').notEmpty().withMessage('item_name is required'),
    body('unit').notEmpty().withMessage('unit is required'),
  ],
  validate,
  createItem
);

router.put('/:id', checkRole('super_admin', 'cooperative_manager', 'field_officer'), updateItem);
router.delete('/:id', checkRole('super_admin', 'cooperative_manager'), removeItem);

router.post(
  '/:itemId/movements',
  checkRole('super_admin', 'cooperative_manager', 'field_officer'),
  [
    body('type').isIn(['in', 'out']).withMessage('type must be "in" or "out"'),
    body('quantity').isFloat({ min: 0.01 }).withMessage('quantity must be greater than 0'),
    body('transaction_date').isDate().withMessage('transaction_date must be YYYY-MM-DD'),
  ],
  validate,
  recordMovement
);

module.exports = router;
