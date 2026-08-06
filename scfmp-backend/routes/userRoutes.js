const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { list, updateStatus, resetPassword } = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

router.use(verifyToken);

router.get('/', checkRole('super_admin', 'cooperative_manager'), list);

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
  [body('new_password').isLength({ min: 6 }).withMessage('new_password must be at least 6 characters')],
  validate,
  resetPassword
);

module.exports = router;
