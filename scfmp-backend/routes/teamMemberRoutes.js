const express = require('express');
const { body, param, query } = require('express-validator');
const controller = require('../controllers/teamMemberController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');
const { TEAM_ROLE_VALUES } = require('../config/teamRoles');
const { ALL_PERMISSIONS } = require('../config/accessControl');
const { PLATFORM_ROLES } = require('../config/accountRoles');
const { imageUpload, handleUploadError } = require('../middleware/uploadMiddleware');

const isAllowedPhotoUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || (
      url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
    );
  } catch {
    return false;
  }
};

const router = express.Router();
router.get('/:id/photo', [param('id').isInt({ min: 1 })], validate, controller.photo);
router.use(verifyToken);

const validators = [
  body('full_name').optional().trim().isLength({ min: 1, max: 150 }),
  body('position').optional().trim().isIn(TEAM_ROLE_VALUES).withMessage('Select an approved official role'),
  body('biography').optional({ nullable: true }).trim().isLength({ max: 3000 }),
  body('responsibilities').optional({ nullable: true }).trim().isLength({ max: 3000 }),
  body('skills').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('photo_url').optional({ checkFalsy: true }).isLength({ max: 500 })
    .withMessage('Profile photo URL must be 500 characters or fewer')
    .bail().custom(isAllowedPhotoUrl)
    .withMessage('Profile photo URL must use HTTPS, or HTTP on localhost'),
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
  body('access.platform_role').optional().isIn(PLATFORM_ROLES),
  body('access.permissions').optional().isArray({ max: ALL_PERMISSIONS.length }),
  body('access.permissions.*').optional().isIn(ALL_PERMISSIONS),
];

router.get('/', [
  query('include_inactive').optional().isBoolean(),
  query('include_hidden').optional().isBoolean(),
], validate, controller.list);
router.post('/photo', checkRole('super_admin'), imageUpload.single('file'), handleUploadError, controller.uploadPhoto);
router.get('/:id', [param('id').isInt({ min: 1 })], validate, controller.getById);
router.post('/', checkRole('super_admin'), [
  body('full_name').trim().isLength({ min: 1, max: 150 }),
  body('position').trim().isIn(TEAM_ROLE_VALUES).withMessage('Select an approved official role'),
  ...validators.slice(2),
], validate, controller.create);
router.put('/:id', checkRole('super_admin'), [param('id').isInt({ min: 1 }), ...validators], validate, controller.update);
router.delete('/:id', checkRole('super_admin'), [param('id').isInt({ min: 1 })], validate, controller.remove);

module.exports = router;
