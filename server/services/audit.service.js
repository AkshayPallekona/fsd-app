const AuditLog = require('../models/AuditLog');

/**
 * Strips sensitive keys like passwords or tokens before writing to audit log
 */
function sanitizeAuditDetails(details = {}) {
  const sensitiveKeys = ['password', 'token', 'tokenHash', 'secret', 'currentPassword', 'newPassword'];
  const sanitized = {};

  for (const [key, value] of Object.entries(details)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      sanitized[key] = sanitizeAuditDetails(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

async function logAdminAction({ adminId, action, targetType, targetId, details = {}, ip = '' }) {
  try {
    const cleanDetails = sanitizeAuditDetails(details);
    return await AuditLog.create({
      admin: adminId,
      action,
      targetType,
      targetId,
      details: cleanDetails,
      ip
    });
  } catch (err) {
    // Audit logging should not crash request but should log error
    // eslint-disable-next-line no-console
    console.error('AuditLog writing failed:', err.message);
  }
}

module.exports = {
  logAdminAction,
  sanitizeAuditDetails
};
