const nodemailer = require('nodemailer');
const {
  orderReference,
  statusLabel,
  customerFirstName
} = require('../utils/orderPublic');
const settingsService = require('./settingsService');

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function transporter() {
  const port = Number.parseInt(process.env.SMTP_PORT, 10) || 587;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
      : undefined
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function itemLines(order, symbol) {
  return (order.items || []).map((item) => {
    const name = item.Product?.name || 'Produit';
    return `${item.quantity} × ${name} — ${item.unit_price} ${symbol}`;
  });
}

function buildBodies({ title, intro, order, symbol, url, extra }) {
  const ref = orderReference(order);
  const lines = [
    intro,
    '',
    `Commande : ${ref}`,
    `Statut : ${statusLabel(order.status)}`,
    `Total : ${order.total_amount} ${symbol}`,
    order.shipping_address ? `Livraison : ${order.shipping_address}` : '',
    '',
    'Articles :',
    ...itemLines(order, symbol).map((line) => `- ${line}`),
    extra ? `\n${extra}` : '',
    url ? `\nSuivre la commande :\n${url}` : '',
    '',
    'Nelya'
  ].filter((line) => line !== '');

  const itemsHtml = itemLines(order, symbol)
    .map((line) => `<li style="margin:6px 0;">${escapeHtml(line)}</li>`)
    .join('');

  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1c1c1c;">
      <h1 style="font-size:22px;font-weight:400;color:#0a0a0a;">${escapeHtml(title)}</h1>
      <p style="line-height:1.6;color:#5a5a5a;">${escapeHtml(intro)}</p>
      <p><strong>Commande ${escapeHtml(ref)}</strong><br>
      Statut : ${escapeHtml(statusLabel(order.status))}<br>
      Total : ${escapeHtml(String(order.total_amount))} ${escapeHtml(symbol)}</p>
      ${order.shipping_address ? `<p>Livraison : ${escapeHtml(order.shipping_address)}</p>` : ''}
      <ul style="padding-left:18px;">${itemsHtml}</ul>
      ${extra ? `<p style="color:#5a5a5a;">${escapeHtml(extra)}</p>` : ''}
      ${url ? `<p style="margin:28px 0;"><a href="${escapeHtml(url)}" style="background:#0a0a0a;color:#fff;text-decoration:none;padding:12px 22px;letter-spacing:1px;font-family:Arial,sans-serif;font-size:13px;">Voir ma commande</a></p>
      <p style="font-size:12px;color:#777;">Ou copiez ce lien : ${escapeHtml(url)}</p>` : ''}
      <p style="margin-top:32px;color:#c6a04a;">Nelya</p>
    </div>`;

  return { text: lines.join('\n'), html };
}

async function sendMail(to, subject, bodies) {
  if (!isConfigured() || !to) return false;
  try {
    await transporter().sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text: bodies.text,
      html: bodies.html
    });
    return true;
  } catch (error) {
    console.error('[Mail] Envoi impossible :', error.message);
    return false;
  }
}

async function sendOrderCreated(order, url) {
  const to = String(order.guest_email || '').trim();
  if (!to) return false;
  const { symbol } = await settingsService.getCurrency().catch(() => ({ symbol: 'DT' }));
  const name = customerFirstName(order);
  const ref = orderReference(order);
  const bodies = buildBodies({
    title: 'Votre commande Nelya',
    intro: `Bonjour${name ? ` ${name}` : ''}, votre commande est bien enregistrée. Conservez le lien ci-dessous pour suivre son statut.`,
    order,
    symbol,
    url,
    extra: 'Paiement en espèces à la livraison.'
  });
  const sent = await sendMail(to, `Nelya — commande ${ref}`, bodies);
  if (sent) console.log('[Mail] Confirmation commande envoyée à', to);
  return sent;
}

async function sendOrderStatus(order, url) {
  const to = String(order.guest_email || '').trim();
  if (!to) return false;
  const { symbol } = await settingsService.getCurrency().catch(() => ({ symbol: 'DT' }));
  const name = customerFirstName(order);
  const ref = orderReference(order);
  const label = statusLabel(order.status);
  const bodies = buildBodies({
    title: `Commande ${label.toLowerCase()}`,
    intro: `Bonjour${name ? ` ${name}` : ''}, le statut de votre commande ${ref} est désormais : ${label}.`,
    order,
    symbol,
    url
  });
  const sent = await sendMail(to, `Nelya — ${ref} ${label.toLowerCase()}`, bodies);
  if (sent) console.log('[Mail] Mise à jour statut envoyée à', to);
  return sent;
}

module.exports = { isConfigured, sendOrderCreated, sendOrderStatus };
