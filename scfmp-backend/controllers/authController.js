const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Cooperative, PasswordResetToken } = require('../models');
const { sendPasswordResetEmail } = require('../services/emailService');

const RESET_TOKEN_EXPIRES_MINUTES = Number(process.env.RESET_TOKEN_EXPIRES_MINUTES) || 30;

/** Hashes a raw token for storage — the raw value only ever exists in the emailed link. */
const hashToken = (rawToken) => crypto.createHash('sha256').update(rawToken).digest('hex');

const generateAccessToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role, cooperative_id: user.cooperative_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

const generateRefreshToken = (user) =>
  jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

/**
 * POST /api/auth/register
 * Only super_admin or a cooperative_manager (for their own coop staff) should
 * call this in production — that authorization check happens at the route level.
 */
const register = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password, role } = req.body;

    // Security: a cooperative_manager can only ever register staff into their OWN
    // cooperative — never trust a cooperative_id passed in the request body for them.
    // Only super_admin (who isn't tied to a cooperative) may specify one explicitly.
    const cooperative_id =
      req.user.role === 'super_admin' ? req.body.cooperative_id : req.user.cooperative_id;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email is already registered' });
    }

    if (cooperative_id) {
      const coop = await Cooperative.findByPk(cooperative_id);
      if (!coop) {
        return res.status(400).json({ success: false, message: 'Cooperative not found' });
      }
    }

    const user = await User.create({
      first_name,
      last_name,
      email,
      phone,
      password_hash: password, // hashed automatically by the User model hook
      role,
      cooperative_id: role === 'super_admin' ? null : cooperative_id,
    });

    return res.status(201).json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.last_login_at = new Date();
    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.status(200).json({
      success: true,
      data: { user, accessToken, refreshToken },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/auth/refresh
 */
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const accessToken = generateAccessToken(user);
    return res.status(200).json({ success: true, data: { accessToken } });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

/**
 * GET /api/auth/me
 */
const getProfile = async (req, res) => {
  return res.status(200).json({ success: true, data: req.user });
};

/**
 * PUT /api/auth/change-password
 * Self-service: the logged-in user changes their own password, must confirm the current one.
 */
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res
        .status(400)
        .json({ success: false, message: 'current_password and new_password are required' });
    }
    if (new_password.length < 6) {
      return res
        .status(400)
        .json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findByPk(req.user.id);
    const isMatch = await user.comparePassword(current_password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password_hash = new_password; // re-hashed automatically by the model's beforeUpdate hook
    await user.save();

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/auth/forgot-password
 * Public endpoint (no auth required — the whole point is the user is locked out).
 * If the email exists, generates a single-use token, emails a reset link, and
 * invalidates any previous unused tokens for that user so only the newest link works.
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with that email address.',
      });
    }
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'This account is inactive. Contact your cooperative manager or SNDS admin.',
      });
    }

    // Invalidate any earlier unused tokens for this user — only the newest link should work
    await PasswordResetToken.destroy({ where: { user_id: user.id, used_at: null } });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MINUTES * 60 * 1000);

    await PasswordResetToken.create({
      user_id: user.id,
      token_hash: hashToken(rawToken),
      expires_at: expiresAt,
    });

    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;
    const emailResult = await sendPasswordResetEmail(user.email, resetLink, RESET_TOKEN_EXPIRES_MINUTES);

    return res.status(200).json({
      success: true,
      message: `A password reset link has been sent to ${user.email}. It expires in ${RESET_TOKEN_EXPIRES_MINUTES} minutes.`,
      // Only present when SMTP isn't configured, so local/dev testing can still proceed —
      // never included once real email delivery is confirmed working.
      ...(emailResult.delivered ? {} : { devNote: 'Email not sent — check server console for the reset link.' }),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/auth/reset-password
 * Public endpoint. Redeems a single-use token (from the emailed link) to set a new password.
 */
const resetPasswordWithToken = async (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return res.status(400).json({ success: false, message: 'token and new_password are required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const resetToken = await PasswordResetToken.findOne({ where: { token_hash: hashToken(token) } });

    if (!resetToken) {
      return res.status(400).json({ success: false, message: 'This reset link is invalid.' });
    }
    if (resetToken.used_at) {
      return res.status(400).json({ success: false, message: 'This reset link has already been used.' });
    }
    if (new Date() > resetToken.expires_at) {
      return res.status(400).json({ success: false, message: 'This reset link has expired. Request a new one.' });
    }

    const user = await User.findByPk(resetToken.user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    user.password_hash = new_password; // re-hashed automatically by the model's beforeUpdate hook
    await user.save();

    resetToken.used_at = new Date(); // single-use: this token can never be redeemed again
    await resetToken.save();

    return res.status(200).json({ success: true, message: 'Your password has been reset. You can now log in.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  register,
  login,
  refresh,
  getProfile,
  changePassword,
  forgotPassword,
  resetPasswordWithToken,
};
