const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  list,
  eligibleMembers,
  getById,
  create,
  update,
  remove,
} = require('../controllers/farmerController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
  FARM_SIZE_UNITS,
  hasFarmSizeValue,
  isValidPositiveFarmSize,
} = require('../utils/farmSize');

const farmSizeValidation = () => [
  body('farm_size')
    .customSanitizer((value) => (typeof value === 'string' ? value.trim() : value))
    .custom(isValidPositiveFarmSize).withMessage('Farm size must be a number greater than zero'),
  body('farm_size_unit')
    .customSanitizer((value) => (typeof value === 'string' ? value.trim() : value))
    .custom((value, { req }) => {
      const hasSize = hasFarmSizeValue(req.body.farm_size);
      const hasUnit = hasFarmSizeValue(value);
      if (hasSize && !hasUnit) throw new Error('Farm size unit is required when farm size is provided');
      if (!hasSize && hasUnit) throw new Error('Farm size is required when a unit is provided');
      if (hasUnit && !FARM_SIZE_UNITS.includes(value)) throw new Error('Farm size unit is invalid');
      return true;
    }),
  body('farm_size_ha')
    .customSanitizer((value) => (typeof value === 'string' ? value.trim() : value))
    .custom(isValidPositiveFarmSize).withMessage('Farm size must be a number greater than zero'),
];

router.use(verifyToken);

router.get('/', list);
router.get(
  '/eligible-members',
  checkRole('super_admin', 'cooperative_manager', 'field_officer'),
  eligibleMembers
);
router.get('/:id', getById);

router.post(
  '/',
  checkRole('super_admin', 'cooperative_manager', 'field_officer'),
  [
    body('member_id').isInt().withMessage('member_id must be a valid member ID'),
    ...farmSizeValidation(),
    body('crop_type')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 100 }).withMessage('Crop type must be 100 characters or fewer'),
    body('district').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
    body('sector').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
    body('cell').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
    body('village').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  ],
  validate,
  create
);

router.put(
  '/:id',
  checkRole('super_admin', 'cooperative_manager', 'field_officer'),
  [
    ...farmSizeValidation(),
    body('crop_type')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 100 }).withMessage('Crop type must be 100 characters or fewer'),
    body('district').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
    body('sector').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
    body('cell').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
    body('village').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  ],
  validate,
  update
);

router.delete('/:id', checkRole('super_admin', 'cooperative_manager'), remove);

module.exports = router;
