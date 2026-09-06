const express = require('express');
const { body, param, query } = require('express-validator');
const controller = require('../controllers/teamMemberController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');
const { TEAM_ROLE_VALUES } = require('../config/teamRoles');
const { ALL_PERMISSIONS } = require('../config/accessControl');

const router = express.Router();
router.use(verifyToken);

const validators = [
  body('full_name').optional().trim().isLength({ min: 1, max: 150 }),
  body('position').optional().trim().isIn(TEAM_ROLE_VALUES).withMessage('Select an approved official role'),
  body('biography').optional({ nullable: true }).trim().isLength({ max: 3000 }),
  body('responsibilities').optional({ nullable: true }).trim().isLength({ max: 3000 }),
  body('skills').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('photo_url').optional({ checkFalsy: true }).isURL({ protocols: ['https'], require_protocol: true }),
  body('linkedin_url').optional({ checkFalsy: true }).isURL({ protocols: ['https'], require_protocol: true }),
  body('github_url').optional({ checkFalsy: true }).isURL({ protocols: ['https'], require_protocol: true }),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('status').optional().isIn(['active', 'inactive']),
  body('profile_visibility').optional().isIn(['visible', 'hidden']),
  body('linked_user_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }),
  body('display_order').optional().isInt({ min: 0, max: 10000 }),
  body('access').optional().isObject(),
  body('access.system_access_enabled').optional().isBoolean().toBoolean(),
  body('access.account_status').optional().isIn(['active', 'inactive']),
  body('access.system_role').optional().isIn(['super_admin', 'cooperative_manager', 'accountant', 'field_officer', 'farmer']),
  body('access.permissions').optional().isArray({ max: ALL_PERMISSIONS.length }),
  body('access.permissions.*').optional().isIn(ALL_PERMISSIONS),
];

router.get('/', [
  query('include_inactive').optional().isBoolean(),
  query('include_hidden').optional().isBoolean(),
], validate, controller.list);
router.get('/:id', [param('id').isInt({ min: 1 })], validate, controller.getById);
router.post('/', checkRole('super_admin'), [
  body('full_name').trim().isLength({ min: 1, max: 150 }),
  body('position').trim().isIn(TEAM_ROLE_VALUES).withMessage('Select an approved official role'),
  ...validators.slice(2),
], validate, controller.create);
router.put('/:id', checkRole('super_admin'), [param('id').isInt({ min: 1 }), ...validators], validate, controller.update);
router.delete('/:id', checkRole('super_admin'), [param('id').isInt({ min: 1 })], validate, controller.remove);

module.exports = router;
