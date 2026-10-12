const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

const SECRET_KEY = /password|token|secret|key|hash|apikey/i;

function scrub(value) {
  if (!value || typeof value !== 'object') return value;
  const out = Array.isArray(value) ? [] : {};
  for (const [key, val] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) continue;
    out[key] = val && typeof val === 'object' ? scrub(val) : val;
  }
  return out;
}

async function resolveActor(req) {
  if (!req?.user?.id) {
    const guest = String(req?.body?.guest_name || '').trim();
    return { actor_id: null, actor_name: guest ? `${guest} (invité)` : 'Invité' };
  }
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'first_name', 'last_name', 'email', 'role']
    });
    if (!user) return { actor_id: req.user.id, actor_name: req.user.role || 'Utilisateur' };
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return { actor_id: user.id, actor_name: name || user.email || user.role };
  } catch {
    return { actor_id: req.user.id, actor_name: req.user.role || 'Utilisateur' };
  }
}

async function write({ req, action, entity, entityId, summary, meta }) {
  try {
    const actor = await resolveActor(req);
    await AuditLog.create({
      actor_id: actor.actor_id,
      actor_name: actor.actor_name,
      action: String(action || 'unknown').slice(0, 80),
      entity: String(entity || 'other').slice(0, 40),
      entity_id: entityId ? String(entityId).slice(0, 80) : null,
      summary: String(summary || action).slice(0, 500),
      meta: meta ? JSON.stringify(scrub(meta)).slice(0, 4000) : null
    });
  } catch (err) {
    console.error('[Audit] enregistrement impossible:', err.message);
  }
}

function log(entry) {
  write(entry).catch(() => {});
}

module.exports = { log, write, scrub };
