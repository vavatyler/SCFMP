const { AuditLog } = require('../models');

const requestDetails = (req = {}) => ({
  ip_address: req.ip || req.socket?.remoteAddress || null,
  user_agent: req.get?.('user-agent')?.slice(0, 255) || null,
});

/**
 * Audit failures must never turn a successful business operation into a 500.
 * The database is still the source of truth, while this emits a visible server error
 * if the append-only audit trail cannot be written.
 */
const recordAuditEvent = async ({ req, actor, action, entityType, entityId, outcome = 'success', metadata }) => {
  try {
    return await AuditLog.create({
      actor_user_id: actor?.id || null,
      cooperative_id: actor?.cooperative_id || metadata?.cooperative_id || null,
      action,
      entity_type: entityType || null,
      entity_id: entityId == null ? null : String(entityId),
      outcome,
      metadata: metadata || null,
      ...requestDetails(req),
    });
  } catch (error) {
    console.error(`Audit log write failed for ${action}:`, error.message);
    return null;
  }
};

module.exports = { recordAuditEvent };
