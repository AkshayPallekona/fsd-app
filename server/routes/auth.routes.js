const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const { ROLES, ALLOWED_REGISTER_ROLES } = require('../constants/roles');
const {
  generateJwt,
  setAuthCookie,
  clearAuthCookie,
  requestPasswordReset,
  resetPassword
} = require('../services/auth.service');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');
const { validate } = require('../middleware/validator');
const ApiResponse = require('../utils/apiResponse');

const router = express.Router();

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const passwordValidator = body('password')
  .matches(passwordRegex)
  .withMessage('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.');

// POST /api/v1/auth/register
router.post(
  '/register',
  authLimiter,
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters.'),
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Must be a valid email address.'),
    passwordValidator,
    body('role')
      .optional()
      .isIn(ALLOWED_REGISTER_ROLES)
      .withMessage(`Role must be one of: ${ALLOWED_REGISTER_ROLES.join(', ')}`),
    body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone cannot exceed 20 characters.')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, email, password, role = ROLES.SEEKER, phone } = req.body;

      // Field allowlist: ensure role cannot be escalated to admin
      const assignedRole = ALLOWED_REGISTER_ROLES.includes(role) ? role : ROLES.SEEKER;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return ApiResponse.error(res, 'EMAIL_EXISTS', 'An account with this email already exists.', 409);
      }

      const user = new User({
        name,
        email,
        password,
        role: assignedRole,
        phone: phone || '',
        status: 'active',
        tokenVersion: 0
      });

      await user.save();

      const token = generateJwt(user);
      setAuthCookie(res, token);

      return ApiResponse.success(
        res,
        { user: user.toJSON() },
        'Registration successful.',
        201
      );
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/auth/login
router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('password').notEmpty().withMessage('Password is required.')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return ApiResponse.error(res, 'INVALID_CREDENTIALS', 'Invalid email or password.', 401);
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return ApiResponse.error(res, 'INVALID_CREDENTIALS', 'Invalid email or password.', 401);
      }

      if (user.status === 'suspended') {
        return ApiResponse.error(
          res,
          'ACCOUNT_SUSPENDED',
          'Your account has been suspended. Please contact support.',
          403
        );
      }

      if (user.status === 'deleted') {
        return ApiResponse.error(res, 'USER_NOT_FOUND', 'User account does not exist.', 401);
      }

      const token = generateJwt(user);
      setAuthCookie(res, token);

      return ApiResponse.success(res, { user: user.toJSON() }, 'Login successful.', 200);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/auth/logout
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  return ApiResponse.success(res, null, 'Logged out successfully.', 200);
});

// POST /api/v1/auth/forgot-password
router.post(
  '/forgot-password',
  authLimiter,
  [body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required.')],
  validate,
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const host = `${req.protocol}://${req.get('host')}`;
      await requestPasswordReset(email, host);

      return ApiResponse.success(
        res,
        null,
        'If an account with that email exists, password reset instructions have been sent.',
        200
      );
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/auth/reset-password
router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').notEmpty().withMessage('Reset token is required.'),
    body('newPassword')
      .matches(passwordRegex)
      .withMessage('New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { token, newPassword } = req.body;
      await resetPassword(token, newPassword);

      return ApiResponse.success(
        res,
        null,
        'Password has been reset successfully. You can now log in with your new password.',
        200
      );
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/auth/me
router.get('/me', authenticate, (req, res) => {
  return ApiResponse.success(res, { user: req.user.toJSON() }, 'User profile fetched.', 200);
});

// PATCH /api/v1/auth/change-password
router.patch(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword')
      .matches(passwordRegex)
      .withMessage('New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user._id).select('+password');
      if (!user) {
        return ApiResponse.error(res, 'USER_NOT_FOUND', 'User not found.', 404);
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return ApiResponse.error(res, 'INVALID_PASSWORD', 'Current password is incorrect.', 400);
      }

      user.password = newPassword;
      user.tokenVersion += 1;
      await user.save();

      // Issue a new valid JWT token for the current session
      const newToken = generateJwt(user);
      setAuthCookie(res, newToken);

      return ApiResponse.success(res, null, 'Password updated successfully.', 200);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
