const crypto = require('crypto');

const STATUS_LABELS = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée'
};

function newPublicToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function isPublicToken(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{20,64}$/.test(value);
}

function publicAppUrl() {
  const raw = process.env.FRONTEND_URL || process.env.ALLOWED_ORIGIN || '';
  return raw.split(',')[0].trim().replace(/\/$/, '');
}

function trackingUrl(token) {
  const base = publicAppUrl();
  if (!base || !token) return '';
  return `${base}/commande/${token}`;
}

function orderReference(order) {
  return `#${String(order.id || '').replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || '';
}

function customerEmail(order) {
  if (order.guest_email) return String(order.guest_email).trim();
  if (order.User?.email) return String(order.User.email).trim();
  return '';
}

function customerFirstName(order) {
  if (order.User?.first_name) return order.User.first_name;
  return String(order.guest_name || '').trim().split(/\s+/)[0] || '';
}

function toPublicOrder(order) {
  const json = typeof order.toJSON === 'function' ? order.toJSON() : order;
  return {
    reference: orderReference(json).replace(/^#/, ''),
    status: json.status,
    statusLabel: statusLabel(json.status),
    createdAt: json.createdAt || json.created_at,
    total_amount: json.total_amount,
    shipping_address: json.shipping_address || '',
    phone: json.phone || '',
    guest_name: json.guest_name || [json.User?.first_name, json.User?.last_name].filter(Boolean).join(' '),
    items: (json.items || []).map((item) => ({
      name: item.Product?.name || 'Produit',
      quantity: item.quantity,
      unit_price: item.unit_price,
      image_url: item.Product?.image_url || ''
    }))
  };
}

module.exports = {
  STATUS_LABELS,
  newPublicToken,
  isPublicToken,
  publicAppUrl,
  trackingUrl,
  orderReference,
  statusLabel,
  customerEmail,
  customerFirstName,
  toPublicOrder
};
