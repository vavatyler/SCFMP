const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  list,
  getById,
  create,
  update,
  remove,
  summary,
} = require('../controllers/productionController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

router.use(verifyToken);

// IMPORTANT: /summary must be declared before /:id, otherwise Express treats "summary" as an :id value
router.get('/summary', summary);

router.get('/', list);
router.get('/:id', getById);

router.post(
  '/',
  checkRole('super_admin', 'cooperative_manager', 'field_officer'),
  [
    body('farmer_id').isInt().withMessage('farmer_id must be a valid farmer ID'),
    body('product_name').notEmpty().withMessage('product_name is required'),
    body('quantity').isFloat({ min: 0.01 }).withMessage('quantity must be greater than 0'),
    body('unit_price').isFloat({ min: 0 }).withMessage('unit_price must be 0 or greater'),
    body('production_date').isDate().withMessage('production_date must be a valid date (YYYY-MM-DD)'),
  ],
  validate,
  create
);

router.put(
  '/:id',
  checkRole('super_admin', 'cooperative_manager', 'field_officer'),
  update
);

router.delete('/:id', checkRole('super_admin', 'cooperative_manager'), remove);

module.exports = router;
