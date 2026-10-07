const mailService = require('./mailService');
const whatsappService = require('./whatsappService');
const { trackingUrl } = require('../utils/orderPublic');

function linkFor(order) {
  return trackingUrl(order.public_token);
}

async function notifyOrderCreated(order) {
  const url = linkFor(order);
  const [email, whatsapp] = await Promise.all([
    mailService.sendOrderCreated(order, url).catch((err) => {
      console.error('[Mail] confirmation :', err.message);
      return false;
    }),
    whatsappService.sendCustomerConfirmation(order, url).catch((err) => {
      console.error('[WhatsApp] confirmation :', err.message);
      return false;
    })
  ]);
  return { email: Boolean(email), whatsapp: Boolean(whatsapp), trackingUrl: url };
}

async function notifyOrderStatus(order) {
  const url = linkFor(order);
  await Promise.all([
    mailService.sendOrderStatus(order, url).catch((err) => {
      console.error('[Mail] statut :', err.message);
    }),
    whatsappService.sendCustomerStatus(order, url).catch((err) => {
      console.error('[WhatsApp] statut :', err.message);
    })
  ]);
}

module.exports = { notifyOrderCreated, notifyOrderStatus };
