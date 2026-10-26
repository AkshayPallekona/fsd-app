const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const { JWT_SECRET, JWT_EXPIRES_IN, NODE_ENV } = require('../config/env');
const { sendResetPasswordEmail } = require('./email.service');

const COOKIE_NAME = 'token';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateJwt(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      tokenVersion: user.tokenVersion
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN
    }
  );
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/'
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

async function requestPasswordReset(email, clientHost) {
  const user = await User.findOne({ email: email.toLowerCase() });
  // Always perform hash and generic behavior to prevent timing attacks / user enumeration
  if (!user || user.status !== 'active') {
    // Return early with generic success
    return { success: true };
  }

  // Delete all older reset tokens for this user
  await PasswordResetToken.deleteMany({ userId: user._id });

  // Generate random 32 bytes token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  await PasswordResetToken.create({
    userId: user._id,
    tokenHash
  });

  const origin = clientHost ? clientHost.replace(/\/$/, '') : 'http://localhost:5000';
  const resetUrl = `${origin}/pages/reset-password.html?token=${rawToken}`;

  await sendResetPasswordEmail(user.email, resetUrl);

  return { success: true };
}

async function resetPassword(rawToken, newPassword) {
  if (!rawToken || typeof rawToken !== 'string') {
    const error = new Error('Invalid or expired reset token.');
    error.statusCode = 400;
    error.code = 'INVALID_TOKEN';
    throw error;
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenDoc = await PasswordResetToken.findOne({ tokenHash });

  if (!tokenDoc) {
    const error = new Error('Invalid or expired reset token.');
    error.statusCode = 400;
    error.code = 'INVALID_TOKEN';
    throw error;
  }

  const user = await User.findById(tokenDoc.userId).select('+password');
  if (!user || user.status !== 'active') {
    await PasswordResetToken.deleteMany({ userId: tokenDoc.userId });
    const error = new Error('User account not found or suspended.');
    error.statusCode = 400;
    error.code = 'ACCOUNT_INACTIVE';
    throw error;
  }

  user.password = newPassword;
  user.tokenVersion += 1; // Invalidate all existing sessions
  await user.save();

  // Single use: delete all reset tokens for this user
  await PasswordResetToken.deleteMany({ userId: user._id });

  return { success: true };
}

module.exports = {
  COOKIE_NAME,
  generateJwt,
  setAuthCookie,
  clearAuthCookie,
  requestPasswordReset,
  resetPassword
};
