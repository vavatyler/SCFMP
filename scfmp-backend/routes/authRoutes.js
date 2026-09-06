const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const {
  register,
  login,
  refresh,
  logout,
  getProfile,
  updatePreferredLanguage,
  changePassword,
  forgotPassword,
  resetPasswordWithToken,
} = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const { isRwandaPhone } = require('../utils/rwandaPhone');
const validate = require('../middleware/validateMiddleware');
const { ALL_ACCOUNT_ROLES } = require('../config/accountRoles');

// Prevents someone from spamming reset emails at an account, or brute-forcing tokens
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, message: 'Too many reset requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strongPassword = (field, label = 'Password') =>
  body(field).custom((value) => {
    if (String(value || '').length < 8 || !/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) {
      throw new Error(`${label} must be at least 8 characters and include uppercase, lowercase, and a number`);
    }
    return true;
  });

router.post(
  '/register',
  verifyToken,
  checkRole('super_admin', 'cooperative_manager'),
  [
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional({ checkFalsy: true }).custom(isRwandaPhone).withMessage('Phone must contain exactly 9 Rwanda local digits'),
    strongPassword('password'),
    body('preferred_language').optional().isIn(['en', 'rw', 'fr']),
    body('member_id').if(body('role').equals('farmer')).isInt({ min: 1 }).withMessage('member_id is required for farmer accounts'),
    body('role')
      .isIn(ALL_ACCOUNT_ROLES)
      .withMessage('Invalid role'),
  ],
  validate,
  register
);

router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

router.post(
  '/refresh',
  [body('refreshToken').isString().notEmpty().withMessage('Refresh token is required')],
  validate,
  refresh
);
router.get('/me', verifyToken, getProfile);
router.post(
  '/logout',
  verifyToken,
  [body('refreshToken').optional().isString().withMessage('Invalid refresh token')],
  validate,
  logout
);
router.put(
  '/preferred-language',
  verifyToken,
  [body('preferred_language').isIn(['en', 'rw', 'fr']).withMessage('Unsupported language')],
  validate,
  updatePreferredLanguage
);

router.put(
  '/change-password',
  verifyToken,
  [
    body('current_password').notEmpty().withMessage('current_password is required'),
    strongPassword('new_password', 'New password'),
  ],
  validate,
  changePassword
);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  [body('email').isEmail().withMessage('A valid email is required')],
  validate,
  forgotPassword
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('token is required'),
    strongPassword('new_password'),
  ],
  validate,
  resetPasswordWithToken
);

module.exports = router;
