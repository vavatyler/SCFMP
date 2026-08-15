const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const controller = require('../controllers/productionController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

router.use(verifyToken);

const listValidation = [
  query('cooperative_id').optional().isInt({ min: 1 }),
  query('farmer_id').optional().isInt({ min: 1 }),
  query('product_id').optional().isInt({ min: 1 }),
  query('status').optional().isIn(['recorded', 'verified', 'rejected']),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

router.get('/products', listValidation, validate, controller.listProducts);
router.get('/analytics', listValidation, validate, controller.analytics);
router.get('/summary', listValidation, validate, controller.summary);
router.get('/', listValidation, validate, controller.list);
router.get('/:id', controller.getById);

router.post(
  '/',
  checkRole('super_admin', 'cooperative_manager', 'field_officer'),
  [
    body('farmer_id').isInt({ min: 1 }).withMessage('farmer_id is required'),
    body('product_id').optional().isInt({ min: 1 }),
    body('product_name').optional().trim().isLength({ min: 1, max: 100 }),
    body('quantity').isFloat({ min: 0.01 }),
    body('unit').optional().trim().isLength({ min: 1, max: 20 }),
    body('unit_price').isFloat({ min: 0 }),
    body('season').optional({ nullable: true }).trim().isLength({ max: 20 }),
    body('status').optional().isIn(['recorded', 'verified', 'rejected']),
    body('production_date').isISO8601().withMessage('production_date must be YYYY-MM-DD'),
  ],
  validate,
  controller.create
);

router.put(
  '/:id',
  checkRole('super_admin', 'cooperative_manager', 'field_officer'),
  [
    body('quantity').optional().isFloat({ min: 0.01 }),
    body('unit_price').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(['recorded', 'verified', 'rejected']),
    body('production_date').optional().isISO8601(),
  ],
  validate,
  controller.update
);
router.delete('/:id', checkRole('super_admin', 'cooperative_manager'), controller.remove);

module.exports = router;
