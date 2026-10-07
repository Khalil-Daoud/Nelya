const crypto = require('crypto');
const { Op } = require('sequelize');
const Setting = require('../models/Setting');
const User = require('../models/User');

const ADMIN_GROUP_ID = 'admin';
const SELLER_GROUP_ID = 'seller';

const PERMISSION_CATALOG = [
  { key: 'orders.update_status', section: 'Commandes', label: 'Changer le statut (attente, confirmée, expédiée, livrée)' },
  { key: 'orders.cancel', section: 'Commandes', label: 'Annuler une commande' },
  { key: 'products.manage', section: 'Catalogue', label: 'Créer et modifier les produits' },
  { key: 'stock.manage', section: 'Catalogue', label: 'Ajuster le stock' },
  { key: 'categories.manage', section: 'Catalogue', label: 'Gérer les catégories' }
];

const ALLOWED_KEYS = new Set(PERMISSION_CATALOG.map((p) => p.key));

function defaultGroups() {
  return [
    {
      id: ADMIN_GROUP_ID,
      name: 'Administrateur',
      system: true,
      permissions: ['*']
    },
    {
      id: SELLER_GROUP_ID,
      name: 'Employé',
      system: true,
      permissions: [...ALLOWED_KEYS]
    }
  ];
}

function sanitizePermissions(raw) {
  if (!Array.isArray(raw)) return [];
  if (raw.includes('*')) return ['*'];
  return [...new Set(raw.map(String).filter((key) => ALLOWED_KEYS.has(key)))];
}

function isSafeCustomId(id) {
  return /^[a-z0-9][a-z0-9_-]{1,62}$/i.test(id)
    && id !== ADMIN_GROUP_ID
    && id !== SELLER_GROUP_ID;
}

function sanitizeGroup(raw, { allowAdmin = false } = {}) {
  const rawId = String(raw?.id || '').trim();
  const name = String(raw?.name || '').trim().slice(0, 40);
  if (!name) return null;

  if (rawId === ADMIN_GROUP_ID) {
    if (!allowAdmin) return null;
    return { id: ADMIN_GROUP_ID, name: 'Administrateur', system: true, permissions: ['*'] };
  }

  if (rawId === SELLER_GROUP_ID) {
    return {
      id: SELLER_GROUP_ID,
      name: name || 'Employé',
      system: true,
      permissions: sanitizePermissions(raw.permissions)
    };
  }

  return {
    id: isSafeCustomId(rawId) ? rawId : newGroupId(),
    name,
    system: false,
    permissions: sanitizePermissions(raw.permissions)
  };
}

function mergeWithDefaults(stored) {
  const defaults = defaultGroups();
  const byId = new Map();
  for (const group of defaults) byId.set(group.id, group);
  if (Array.isArray(stored)) {
    for (const raw of stored) {
      const group = sanitizeGroup(raw, { allowAdmin: true });
      if (!group) continue;
      if (group.id === ADMIN_GROUP_ID) {
        byId.set(ADMIN_GROUP_ID, defaults[0]);
        continue;
      }
      byId.set(group.id, group);
    }
  }
  const admin = byId.get(ADMIN_GROUP_ID);
  const seller = byId.get(SELLER_GROUP_ID);
  const rest = [...byId.values()].filter((g) => g.id !== ADMIN_GROUP_ID && g.id !== SELLER_GROUP_ID);
  return [admin, seller, ...rest];
}

async function getPermissionGroups() {
  const setting = await Setting.findByPk('permission_groups');
  if (!setting?.value) return defaultGroups();
  try {
    return mergeWithDefaults(JSON.parse(setting.value));
  } catch {
    return defaultGroups();
  }
}

async function setPermissionGroups(raw) {
  const next = mergeWithDefaults(Array.isArray(raw) ? raw : raw?.groups);
  const ids = new Set(next.map((g) => g.id));
  const previous = await getPermissionGroups();
  const removed = previous.filter((g) => !g.system && !ids.has(g.id)).map((g) => g.id);

  await Setting.upsert({ key: 'permission_groups', value: JSON.stringify(next) });

  if (removed.length) {
    await User.update(
      { permission_group_id: SELLER_GROUP_ID },
      { where: { permission_group_id: { [Op.in]: removed } } }
    );
  }

  return next;
}

function resolveGroupId(user) {
  if (!user || user.role === 'client') return null;
  if (user.role === 'admin') return ADMIN_GROUP_ID;
  return user.permission_group_id || SELLER_GROUP_ID;
}

function permissionsOfGroup(groups, groupId) {
  if (groupId === ADMIN_GROUP_ID) return ['*'];
  const group = groups.find((g) => g.id === groupId);
  if (!group) return [];
  return Array.isArray(group.permissions) ? group.permissions : [];
}

function hasPermission(permissions, key) {
  return permissions.includes('*') || permissions.includes(key);
}

async function permissionsForUserId(userId) {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'role', 'permission_group_id']
  });
  if (!user) return [];
  if (user.role === 'admin') return ['*'];
  if (user.role !== 'seller') return [];
  const groups = await getPermissionGroups();
  return permissionsOfGroup(groups, resolveGroupId(user));
}

async function userHas(userId, key) {
  const permissions = await permissionsForUserId(userId);
  return hasPermission(permissions, key);
}

function newGroupId() {
  return `grp_${crypto.randomBytes(8).toString('hex')}`;
}

function accessPayload(groups) {
  return {
    catalog: PERMISSION_CATALOG,
    groups
  };
}

module.exports = {
  ADMIN_GROUP_ID,
  SELLER_GROUP_ID,
  PERMISSION_CATALOG,
  getPermissionGroups,
  setPermissionGroups,
  resolveGroupId,
  permissionsOfGroup,
  hasPermission,
  permissionsForUserId,
  userHas,
  newGroupId,
  accessPayload,
  defaultGroups
};
