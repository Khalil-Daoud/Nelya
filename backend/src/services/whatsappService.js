const fetch = global.fetch || require('node-fetch');
const settingsService = require('./settingsService');
const { orderReference, customerFirstName, statusLabel } = require('../utils/orderPublic');

/**
 * Notifications WhatsApp liées aux commandes.
 *
 * Deux usages distincts, qui n'ont pas les mêmes contraintes :
 *  - La boutique est prévenue sur son propre numéro : CallMeBot (gratuit), Twilio
 *    ou un webhook suffisent, sinon on écrit la notification dans les logs.
 *  - Le client reçoit une confirmation sans rien faire : WhatsApp impose un
 *    fournisseur officiel (Meta Cloud API ou Twilio) car il s'agit d'écrire à un
 *    numéro qui n'a pas ouvert la conversation. Sans fournisseur, on ne tente rien :
 *    le site propose alors au client d'envoyer lui-même le récapitulatif.
 */
class WhatsAppService {
  /** Nom affiché du client, qu'il ait un compte ou non */
  customerName(order) {
    if (order.User) {
      return `${order.User.first_name || ''} ${order.User.last_name || ''}`.trim();
    }
    return order.guest_name ? `${order.guest_name} (invité)` : 'Client';
  }

  orderReference(order) {
    return orderReference(order);
  }

  /** Message détaillé destiné à la boutique */
  formatMessage(order, symbol = '€') {
    const lines = [];
    lines.push(`*Nouvelle commande* ${this.orderReference(order)}`);
    lines.push(`*Client*: ${this.customerName(order)}`);
    lines.push(`*Téléphone*: ${order.phone || order.notes?.match(/Téléphone: ([^|]+)/)?.[1] || ''}`);
    lines.push(`*Adresse*: ${order.shipping_address || ''}`);
    lines.push(`*Total*: ${order.total_amount} ${symbol}`);
    lines.push('\n*Articles:*');
    order.items?.forEach(item => {
      const productName = item.Product?.name || 'Produit inconnu';
      lines.push(`- ${productName} x${item.quantity} @ ${item.unit_price} ${symbol}`);
    });
    return lines.join('\n');
  }

  /** Confirmation courte destinée au client */
  formatCustomerMessage(order, symbol = '€', trackingLink = '') {
    const name = customerFirstName(order);
    const lines = [
      `Bonjour ${name || ''}`.trim() + ',',
      `Votre commande Nelya ${this.orderReference(order)} est bien enregistrée.`,
      `Montant : ${order.total_amount} ${symbol}.`
    ];
    (order.items || []).forEach((item) => {
      const productName = item.Product?.name || 'Produit';
      lines.push(`- ${productName} x${item.quantity}`);
    });
    if (trackingLink) {
      lines.push('', `Suivre la commande : ${trackingLink}`);
    }
    lines.push('', 'Nous vous contactons très vite pour la livraison. Merci de votre confiance !');
    return lines.join('\n');
  }

  formatStatusMessage(order, symbol = '€', trackingLink = '') {
    const name = customerFirstName(order);
    return [
      `Bonjour ${name || ''}`.trim() + ',',
      `Votre commande Nelya ${this.orderReference(order)} est maintenant : ${statusLabel(order.status)}.`,
      trackingLink ? `Détails : ${trackingLink}` : ''
    ].filter(Boolean).join('\n');
  }

  /** Envoi d'un texte libre via Twilio – renvoie true si l'envoi a réussi */
  async sendViaTwilio(to, message) {
    if (!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM)) {
      return false;
    }
    try {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await twilio.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: `whatsapp:+${to}`,
        body: message
      });
      return true;
    } catch (e) {
      console.error('[WhatsApp] Twilio error:', e.message);
      return false;
    }
  }

  /**
   * Envoi via Meta Cloud API. Un message à l'initiative de la boutique doit utiliser
   * un modèle validé au préalable par Meta ; ses variables sont passées en paramètres.
   */
  async sendTemplateViaCloudApi(to, params) {
    const token = process.env.WHATSAPP_CLOUD_TOKEN;
    const phoneId = process.env.WHATSAPP_CLOUD_PHONE_ID;
    if (!token || !phoneId) return false;

    const template = process.env.WHATSAPP_CLOUD_TEMPLATE || 'order_confirmation';
    const language = process.env.WHATSAPP_CLOUD_LANG || 'fr';

    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: template,
            language: { code: language },
            components: [{
              type: 'body',
              parameters: params.map(text => ({ type: 'text', text: String(text) }))
            }]
          }
        })
      });
      if (!res.ok) {
        throw new Error(`Cloud API ${res.status}: ${await res.text()}`);
      }
      return true;
    } catch (e) {
      console.error('[WhatsApp] Cloud API error:', e.message);
      return false;
    }
  }

  /** Prévient la boutique qu'une commande vient d'arriver */
  async sendOrderNotification(order) {
    const toNumber = await settingsService.getWhatsAppNumber();
    if (!toNumber) {
      console.warn('[WhatsApp] Aucun numéro de boutique configuré – notification ignorée');
      return;
    }
    const { symbol } = await settingsService.getCurrency().catch(() => ({ symbol: '€' }));
    const message = this.formatMessage(order, symbol);

    // CallMeBot : gratuit, mais n'écrit qu'aux numéros ayant activé le bot.
    if (process.env.CALLMEBOT_API_KEY) {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(`+${toNumber}`)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(process.env.CALLMEBOT_API_KEY)}`;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`CallMeBot responded ${res.status}`);
        console.log('[WhatsApp] Notification boutique envoyée via CallMeBot');
        return;
      } catch (e) {
        console.error('[WhatsApp] CallMeBot error:', e.message);
      }
    }

    if (await this.sendViaTwilio(toNumber, message)) {
      console.log('[WhatsApp] Notification boutique envoyée via Twilio');
      return;
    }

    if (process.env.WHATSAPP_WEBHOOK_URL) {
      try {
        const res = await fetch(process.env.WHATSAPP_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: `+${toNumber}`, message })
        });
        if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
        console.log('[WhatsApp] Notification boutique envoyée via webhook');
        return;
      } catch (e) {
        console.error('[WhatsApp] Webhook error:', e.message);
      }
    }

    console.log('---[WhatsApp Notification]---');
    console.log('To:', `+${toNumber}`);
    console.log(message);
    console.log('---[End]---');
  }

  /**
   * Confirme la commande au client. Ne fait rien tant que l'admin n'a pas activé
   * l'option et qu'aucun fournisseur officiel n'est configuré : dans ce cas le
   * client enverra lui-même le récapitulatif depuis le site.
   */
  async sendToCustomer(order, message, templateParams) {
    const to = settingsService.normalizeWhatsAppNumber(order.phone);
    if (!to) {
      console.warn('[WhatsApp] Téléphone client inexploitable – confirmation ignorée');
      return false;
    }

    if (await this.sendTemplateViaCloudApi(to, templateParams)) {
      console.log('[WhatsApp] Message client envoyé via Cloud API');
      return true;
    }

    if (await this.sendViaTwilio(to, message)) {
      console.log('[WhatsApp] Message client envoyé via Twilio');
      return true;
    }

    return false;
  }

  async sendCustomerConfirmation(order, trackingLink = '') {
    const invite = await settingsService.getWhatsAppInvite();
    const enabled = await settingsService.getNotifyCustomer();
    if (!invite || !enabled || !settingsService.isCustomerProviderConfigured()) return false;

    const { symbol } = await settingsService.getCurrency().catch(() => ({ symbol: '€' }));
    const firstName = customerFirstName(order);

    const sent = await this.sendToCustomer(
      order,
      this.formatCustomerMessage(order, symbol, trackingLink),
      [
        firstName || 'client',
        this.orderReference(order),
        `${order.total_amount} ${symbol}`
      ]
    );
    if (!sent) {
      console.warn('[WhatsApp] Confirmation client non envoyée (aucun fournisseur disponible)');
    }
    return sent;
  }

  async sendCustomerStatus(order, trackingLink = '') {
    if (!settingsService.isCustomerProviderConfigured()) return false;
    const invite = await settingsService.getWhatsAppInvite();
    const enabled = await settingsService.getNotifyCustomer();
    if (!invite || !enabled) return false;

    const { symbol } = await settingsService.getCurrency().catch(() => ({ symbol: '€' }));
    return this.sendToCustomer(
      order,
      this.formatStatusMessage(order, symbol, trackingLink),
      [
        customerFirstName(order) || 'client',
        this.orderReference(order),
        statusLabel(order.status)
      ]
    );
  }
}

module.exports = new WhatsAppService();
