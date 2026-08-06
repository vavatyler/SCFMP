const nodemailer = require('nodemailer');

/**
 * Builds a transporter from environment variables. Using an explicit host/port
 * config (rather than nodemailer's `service: 'gmail'` shortcut) means swapping
 * to any other SMTP provider in production is just an env var change — no code
 * change needed, per the requirement.
 *
 * For Gmail specifically: SMTP_USER must be a full Gmail address and SMTP_PASS
 * must be a 16-character "App Password" (Google Account → Security → 2-Step
 * Verification → App Passwords) — a regular Gmail login password will not work.
 */
const buildTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null; // not configured yet
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465, // true for port 465, false for 587/others
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Sends the password reset email. If SMTP isn't configured (common during
 * initial local setup), falls back to logging the reset link to the server
 * console instead of failing outright — so the reset flow is still testable
 * end-to-end before email credentials are wired up.
 */
const sendPasswordResetEmail = async (toEmail, resetLink, expiresInMinutes) => {
  const transporter = buildTransporter();

  const subject = 'Reset your SCFMP password';
  const text = `We received a request to reset your SCFMP password.

Click the link below to choose a new password. This link expires in ${expiresInMinutes} minutes and can only be used once:

${resetLink}

If you didn't request this, you can safely ignore this email — your password will not be changed.

— SmartNyamagabe Digital Solutions Ltd`;

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1C3829;">Reset your SCFMP password</h2>
      <p>We received a request to reset your password. Click the button below to choose a new one.</p>
      <p style="margin: 24px 0;">
        <a href="${resetLink}" style="background:#1C3829; color:#F6F2E9; padding:12px 20px; border-radius:8px; text-decoration:none; display:inline-block;">
          Reset my password
        </a>
      </p>
      <p style="color:#5A5548; font-size: 13px;">
        This link expires in ${expiresInMinutes} minutes and can only be used once.
        If you didn't request this, you can safely ignore this email.
      </p>
      <p style="color:#5A5548; font-size: 13px;">— SmartNyamagabe Digital Solutions Ltd</p>
    </div>
  `;

  if (!transporter) {
    console.warn(
      '\n⚠ SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing in .env).' +
        '\n  Falling back to console output so you can still test the reset flow:\n' +
        `\n  Reset link for ${toEmail}:\n  ${resetLink}\n`
    );
    return { delivered: false, reason: 'SMTP not configured — link logged to console' };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject,
    text,
    html,
  });

  return { delivered: true };
};

module.exports = { sendPasswordResetEmail };
