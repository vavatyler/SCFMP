const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();

const { list, update, updateStatus, resetPassword, listAuditLogs } = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');
const { ALL_ACCOUNT_ROLES, ACCOUNT_SCOPES } = require('../config/accountRoles');

router.use(verifyToken);

router.get('/', checkRole('super_admin', 'cooperative_manager'), [
  query('cooperative_id').optional().isInt({ min: 1 }),
  query('account_scope').optional().isIn(Object.values(ACCOUNT_SCOPES)),
  query('role').optional().isIn(ALL_ACCOUNT_ROLES),
  query('search').optional().trim().isLength({ max: 150 }),
], validate, list);
router.get('/audit-logs', checkRole('super_admin', 'cooperative_manager'), listAuditLogs);

router.put(
  '/:id',
  checkRole('super_admin', 'cooperative_manager'),
  [
    body('first_name').optional().trim().isLength({ min: 1, max: 100 }),
    body('last_name').optional().trim().isLength({ min: 1, max: 100 }),
    body('role').optional().isIn(ALL_ACCOUNT_ROLES),
    body('preferred_language').optional().isIn(['en', 'rw', 'fr']),
  ],
  validate,
  update
);

router.put(
  '/:id/status',
  checkRole('super_admin', 'cooperative_manager'),
  [body('status').isIn(['active', 'inactive']).withMessage('status must be active or inactive')],
  validate,
  updateStatus
);

router.put(
  '/:id/reset-password',
  checkRole('super_admin', 'cooperative_manager'),
  [
    body('new_password').custom((value) => {
      if (String(value || '').length < 8 || !/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) {
        throw new Error('new_password must be at least 8 characters and include uppercase, lowercase, and a number');
      }
      return true;
    }),
  ],
  validate,
  resetPassword
);

module.exports = router;
