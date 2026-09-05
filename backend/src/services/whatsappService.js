const fetch = global.fetch || require('node-fetch');
const settingsService = require('./settingsService');

/**
 * Service for sending WhatsApp notifications about new orders.
 * Supports multiple providers via environment configuration:
 *  - CallMeBot (free, simple GET request)
 *  - Twilio WhatsApp API (requires twilio npm package)
 *  - Generic HTTP webhook (any external service)
 * If none are configured, falls back to console logging.
 */
class WhatsAppService {
  constructor() {
    this.toNumber = process.env.WHATSAPP_TO_NUMBER ?
      (process.env.WHATSAPP_TO_NUMBER.startsWith('+') ? process.env.WHATSAPP_TO_NUMBER : `+${process.env.WHATSAPP_TO_NUMBER}`)
      : null;
  }

  /** Build a human‑readable message for a given order */
  formatMessage(order, symbol = '€') {
    const lines = [];
    lines.push(`*Nouvelle commande* #${order.id.slice(0, 8)}`);
    lines.push(`*Client*: ${order.User?.first_name || ''} ${order.User?.last_name || ''}`);
    lines.push(`*Téléphone*: ${order.notes?.match(/Téléphone: ([^|]+)/)?.[1] || ''}`);
    lines.push(`*Adresse*: ${order.shipping_address || ''}`);
    lines.push(`*Total*: ${order.total_amount} ${symbol}`);
    lines.push('\n*Articles:*');
    order.items?.forEach(item => {
      const productName = item.Product?.name || 'Produit inconnu';
      lines.push(`- ${productName} x${item.quantity} @ ${item.unit_price} ${symbol}`);
    });
    return lines.join('\n');
  }

  /** Main entry point – called with a Sequelize Order instance */
  async sendOrderNotification(order) {
    if (!this.toNumber) {
      console.warn('[WhatsApp] WHATSAPP_TO_NUMBER not set – skipping notification');
      return;
    }
    const { symbol } = await settingsService.getCurrency().catch(() => ({ symbol: '€' }));
    const message = this.formatMessage(order, symbol);

    // 1️⃣ CallMeBot (simple GET)
    if (process.env.CALLMEBOT_API_KEY) {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(this.toNumber)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(process.env.CALLMEBOT_API_KEY)}`;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`CallMeBot responded ${res.status}`);
        console.log('[WhatsApp] Message sent via CallMeBot');
        return;
      } catch (e) {
        console.error('[WhatsApp] CallMeBot error:', e);
      }
    }

    // 2️⃣ Twilio (requires npm package "twilio")
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM) {
      try {
        const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await twilio.messages.create({
          from: process.env.TWILIO_WHATSAPP_FROM,
          to: `whatsapp:${this.toNumber}`,
          body: message
        });
        console.log('[WhatsApp] Message sent via Twilio');
        return;
      } catch (e) {
        console.error('[WhatsApp] Twilio error:', e);
      }
    }

    // 3️⃣ Generic webhook (POST JSON {to, message})
    if (process.env.WHATSAPP_WEBHOOK_URL) {
      try {
        const res = await fetch(process.env.WHATSAPP_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: this.toNumber, message })
        });
        if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
        console.log('[WhatsApp] Message sent via webhook');
        return;
      } catch (e) {
        console.error('[WhatsApp] Webhook error:', e);
      }
    }

    // 4️⃣ Fallback – log to console with clear delimiter
    console.log('---[WhatsApp Notification]---');
    console.log('To:', this.toNumber);
    console.log(message);
    console.log('---[End]---');
  }
}

module.exports = new WhatsAppService();
