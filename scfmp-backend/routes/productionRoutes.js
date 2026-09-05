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
  query('production_mode').optional().isIn(['individual', 'group']),
  query('farmer_id').optional().isInt({ min: 1 }),
  query('farmer_group_id').optional().isInt({ min: 1 }),
  query('product_id').optional().isInt({ min: 1 }),
  query('status').optional().isIn(['recorded', 'verified', 'rejected']),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

router.get('/products', listValidation, validate, controller.listProducts);
router.get('/farmer-groups', listValidation, validate, controller.listFarmerGroups);
router.get('/analytics', listValidation, validate, controller.analytics);
router.get('/summary', listValidation, validate, controller.summary);
router.get('/', listValidation, validate, controller.list);
router.get('/:id', controller.getById);

router.post(
  '/',
  checkRole('super_admin', 'cooperative_manager', 'field_officer'),
  [
    body('production_mode').optional().isIn(['individual', 'group']),
    body('farmer_id').optional({ checkFalsy: true }).isInt({ min: 1 }),
    body('farmer_group_id').optional({ checkFalsy: true }).isInt({ min: 1 }),
    body('production_mode').custom((value, { req }) => {
      const mode = value || 'individual';
      if (mode === 'individual' && (!req.body.farmer_id || req.body.farmer_group_id)) {
        throw new Error('Individual production requires farmer_id only');
      }
      if (mode === 'group' && req.body.farmer_id) {
        throw new Error('Group production cannot have a primary farmer_id');
      }
      return true;
    }),
    body('production_mode').custom((value, { req }) => {
      // Legacy clients omit production_mode and retain the historical defaults.
      // The current Add Production form sends it and must provide the complete record.
      if (!value) return true;
      if (!req.body.product_id && !String(req.body.product_name || '').trim()) {
        throw new Error('Crop type is required');
      }
      if (!String(req.body.unit || '').trim()) throw new Error('Unit is required');
      return true;
    }),
    body('product_id').optional().isInt({ min: 1 }),
    body('product_name').optional().trim().isLength({ min: 1, max: 100 }),
    body('quantity').optional().isFloat({ min: 0.01 }),
    body('actual_harvest').optional().isFloat({ min: 0.01 }),
    body('actual_harvest').custom((value, { req }) => {
      if (value === undefined && req.body.quantity === undefined) {
        throw new Error('actual_harvest is required');
      }
      return true;
    }),
    body('expected_production').optional({ nullable: true }).isFloat({ min: 0.01 }),
    body('reporting_period').optional({ nullable: true }).trim().isLength({ max: 50 }),
    body('variety').optional({ nullable: true }).trim().isLength({ max: 100 }),
    body('production_category').optional({ nullable: true }).trim().isLength({ max: 100 }),
    body('unit').optional().trim().isLength({ min: 1, max: 20 }),
    body('unit_price').optional().isFloat({ min: 0 }),
    body('season').optional({ nullable: true }).trim().isLength({ max: 20 }),
    body('status').optional().isIn(['recorded', 'verified', 'rejected']),
    body('production_date').optional().isISO8601(),
    body('harvest_date').optional().isISO8601(),
    body('harvest_date').custom((value, { req }) => {
      if (!value && !req.body.production_date) {
        throw new Error('harvest_date is required');
      }
      return true;
    }),
    body('production_location').optional({ nullable: true }).trim().isLength({ max: 255 }),
    body('quality_grade').optional({ nullable: true }).trim().isLength({ max: 50 }),
    body('storage_location').optional({ nullable: true }).trim().isLength({ max: 255 }),
    body('storage_quantity').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }),
    body('sold_quantity').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('remaining_quantity').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }),
    body('buyer').optional({ nullable: true }).trim().isLength({ max: 150 }),
    body('contributions').optional().isArray({ max: 500 }),
    body('contributions.*.farmer_id').optional().isInt({ min: 1 }),
    body('contributions.*.quantity').optional().isFloat({ min: 0.01 }),
    body('contributions.*.unit').optional().trim().isLength({ min: 1, max: 20 }),
    body('notes').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  ],
  validate,
  controller.create
);

router.put(
  '/:id',
  checkRole('super_admin', 'cooperative_manager', 'field_officer'),
  [
    body('quantity').optional().isFloat({ min: 0.01 }),
    body('actual_harvest').optional().isFloat({ min: 0.01 }),
    body('expected_production').optional({ nullable: true }).isFloat({ min: 0.01 }),
    body('reporting_period').optional({ nullable: true }).trim().isLength({ max: 50 }),
    body('variety').optional({ nullable: true }).trim().isLength({ max: 100 }),
    body('production_category').optional({ nullable: true }).trim().isLength({ max: 100 }),
    body('unit').optional().trim().isLength({ min: 1, max: 20 }),
    body('unit_price').optional().isFloat({ min: 0 }),
    body('season').optional({ nullable: true }).trim().isLength({ max: 20 }),
    body('status').optional().isIn(['recorded', 'verified', 'rejected']),
    body('production_date').optional().isISO8601(),
    body('harvest_date').optional().isISO8601(),
    body('product_id').optional().isInt({ min: 1 }),
    body('product_name').optional().trim().isLength({ min: 1, max: 100 }),
    body('production_location').optional({ nullable: true }).trim().isLength({ max: 255 }),
    body('quality_grade').optional({ nullable: true }).trim().isLength({ max: 50 }),
    body('storage_location').optional({ nullable: true }).trim().isLength({ max: 255 }),
    body('storage_quantity').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }),
    body('sold_quantity').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('remaining_quantity').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }),
    body('buyer').optional({ nullable: true }).trim().isLength({ max: 150 }),
    body('contributions').optional().isArray({ max: 500 }),
    body('contributions.*.farmer_id').optional().isInt({ min: 1 }),
    body('contributions.*.quantity').optional().isFloat({ min: 0.01 }),
    body('contributions.*.unit').optional().trim().isLength({ min: 1, max: 20 }),
    body('notes').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  ],
  validate,
  controller.update
);
router.delete('/:id', checkRole('super_admin', 'cooperative_manager'), controller.remove);

module.exports = router;
