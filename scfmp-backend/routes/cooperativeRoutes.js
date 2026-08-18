const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const {
  list,
  getById,
  create,
  update,
  remove,
} = require('../controllers/cooperativeController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole, checkCooperativeScope } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');
const { isRwandaPhone } = require('../utils/rwandaPhone');

const ORGANIZATION_TYPES = [
  'cooperative',
  'farmer_group',
  'sme',
  'school',
  'association',
  'ngo',
  'other',
];

const organizationValidators = [
  body('name').trim().notEmpty().withMessage('Organization name is required').isLength({ max: 150 }),
  body('organization_type').optional().isIn(ORGANIZATION_TYPES).withMessage('Invalid organization type'),
  body('registration_number').optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
  body('district').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('sector').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('cell').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('village').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('phone')
    .optional({ checkFalsy: true })
    .custom(isRwandaPhone)
    .withMessage('Phone must contain exactly 9 Rwanda local digits'),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Enter a valid email address'),
  body('status').optional().isIn(['active', 'inactive', 'suspended']),
];

const organizationUpdateValidators = organizationValidators.map((validator, index) =>
  index === 0 ? body('name').optional().trim().notEmpty().isLength({ max: 150 }) : validator
);

router.use(verifyToken);

router.get('/', checkRole('super_admin'), list);
router.get('/:id', [param('id').isInt({ min: 1 })], validate, checkCooperativeScope, getById);
router.post('/', checkRole('super_admin'), organizationValidators, validate, create);
router.put(
  '/:id',
  checkRole('super_admin', 'cooperative_manager'),
  [param('id').isInt({ min: 1 }), ...organizationUpdateValidators],
  validate,
  checkCooperativeScope,
  update
);
router.delete('/:id', checkRole('super_admin'), [param('id').isInt({ min: 1 })], validate, remove);

module.exports = router;
