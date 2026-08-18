const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { list, getById, create, update, remove } = require('../controllers/memberController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');
const { isRwandaPhone } = require('../utils/rwandaPhone');

const optionalMemberFields = [
  body('gender').optional({ checkFalsy: true }).isIn(['male', 'female', 'other']),
  body('phone')
    .optional({ checkFalsy: true })
    .custom(isRwandaPhone)
    .withMessage('Phone must contain exactly 9 Rwanda local digits'),
  body('address').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('membership_date').optional({ checkFalsy: true }).isISO8601(),
];

router.use(verifyToken);

// Everyone with a login can view members (scoped to their own cooperative in the controller)
router.get('/', list);
router.get('/:id', getById);

// Only managers, field officers, and super_admin can create/edit/delete members
router.post(
  '/',
  checkRole('super_admin', 'cooperative_manager', 'field_officer'),
  [
    body('first_name')
      .trim()
      .notEmpty().withMessage('First name is required')
      .bail()
      .isLength({ max: 100 }).withMessage('First name must be 100 characters or fewer'),
    body('last_name')
      .trim()
      .notEmpty().withMessage('Last name is required')
      .bail()
      .isLength({ max: 100 }).withMessage('Last name must be 100 characters or fewer'),
    ...optionalMemberFields,
  ],
  validate,
  create
);

router.put(
  '/:id',
  checkRole('super_admin', 'cooperative_manager', 'field_officer'),
  [
    body('first_name')
      .optional()
      .trim()
      .notEmpty().withMessage('First name is required')
      .bail()
      .isLength({ max: 100 }).withMessage('First name must be 100 characters or fewer'),
    body('last_name')
      .optional()
      .trim()
      .notEmpty().withMessage('Last name is required')
      .bail()
      .isLength({ max: 100 }).withMessage('Last name must be 100 characters or fewer'),
    ...optionalMemberFields,
  ],
  validate,
  update
);

router.delete('/:id', checkRole('super_admin', 'cooperative_manager'), remove);

module.exports = router;
