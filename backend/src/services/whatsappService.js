const fetch = global.fetch || require('node-fetch');
const settingsService = require('./settingsService');
const { orderReference, customerFirstName, statusLabel, parseExtraFields } = require('../utils/orderPublic');

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
    parseExtraFields(order.extra_fields).forEach((row) => {
      if (row?.label && row?.value) lines.push(`*${row.label}*: ${row.value}`);
    });
    lines.push(`*Total*: ${order.total_amount} ${symbol}`);
    lines.push('\n*Articles:*');
    order.items?.forEach(item => {
      const productName = item.Product?.name || 'Produit inconnu';
      lines.push(`- ${productName} x${item.quantity} @ ${item.unit_price} ${symbol}`);
    });
    return lines.join('\n');
  }

  /** Récapitulatif complet envoyé au client depuis le numéro boutique */
  formatCustomerMessage(order, symbol = '€', trackingLink = '') {
    const name = customerFirstName(order);
    const lines = [
      `Bonjour${name ? ` ${name}` : ''},`,
      `Votre commande Nelya ${this.orderReference(order)} est bien enregistrée.`,
      '',
      '*Articles :*'
    ];
    (order.items || []).forEach((item) => {
      const productName = item.Product?.name || 'Produit';
      lines.push(`- ${productName} x${item.quantity} — ${item.unit_price} ${symbol}`);
    });
    lines.push('', `*Total :* ${order.total_amount} ${symbol}`);
    if (order.shipping_address) lines.push(`*Livraison :* ${order.shipping_address}`);
    parseExtraFields(order.extra_fields).forEach((row) => {
      if (row?.label && row?.value) lines.push(`*${row.label} :* ${row.value}`);
    });
    lines.push('*Paiement :* espèces à la livraison');
    if (trackingLink) {
      lines.push('', `Suivre la commande : ${trackingLink}`);
    }
    lines.push('', 'Nous vous contactons très vite. Merci de votre confiance !');
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

  async sendViaCallMeBot(toNumber, message) {
    const apikey = await settingsService.getCallMeBotKey();
    if (!apikey || !toNumber) return false;
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(`+${toNumber}`)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apikey)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`CallMeBot responded ${res.status}`);
      return true;
    } catch (e) {
      console.error('[WhatsApp] CallMeBot error:', e.message);
      return false;
    }
  }

  async sendViaCloudApiText(to, message) {
    const token = process.env.WHATSAPP_CLOUD_TOKEN;
    const phoneId = process.env.WHATSAPP_CLOUD_PHONE_ID;
    if (!token || !phoneId || !to) return false;
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
          type: 'text',
          text: { preview_url: true, body: message }
        })
      });
      if (!res.ok) throw new Error(`Cloud API ${res.status}: ${await res.text()}`);
      return true;
    } catch (e) {
      console.error('[WhatsApp] Cloud API texte :', e.message);
      return false;
    }
  }

  async sendViaUltramsg(toNumber, message) {
    const { instance, token } = await settingsService.getUltramsgConfig();
    if (!instance || !token || !toNumber) return false;
    try {
      const res = await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token,
          to: `+${toNumber}`,
          body: message
        })
      });
      if (!res.ok) throw new Error(`UltraMsg ${res.status}: ${await res.text()}`);
      return true;
    } catch (e) {
      console.error('[WhatsApp] UltraMsg :', e.message);
      return false;
    }
  }

  async sendViaWebhook(toNumber, message) {
    if (!process.env.WHATSAPP_WEBHOOK_URL || !toNumber) return false;
    try {
      const res = await fetch(process.env.WHATSAPP_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: `+${toNumber}`, message })
      });
      if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
      return true;
    } catch (e) {
      console.error('[WhatsApp] Webhook error:', e.message);
      return false;
    }
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

    if (await this.sendViaCallMeBot(toNumber, message)) return;
    if (await this.sendViaTwilio(toNumber, message)) return;
    if (await this.sendViaWebhook(toNumber, message)) return;

    console.warn('[WhatsApp] Notification boutique non envoyée : aucun fournisseur configuré.');
  }

  /**
   * Envoie le récapitulatif au numéro saisi au checkout, depuis le compte boutique
   * (Cloud API / Twilio / UltraMsg). Le numéro boutique en Paramètres n’est pas
   * un mot de passe WhatsApp : sans API, aucun message ne part.
   */
  async sendToCustomer(order, message, templateParams) {
    const to = settingsService.normalizeWhatsAppNumber(order.phone);
    if (!to) {
      console.warn('[WhatsApp] Téléphone client inexploitable – confirmation ignorée');
      return false;
    }

    if (await this.sendViaCloudApiText(to, message)) return true;
    if (await this.sendTemplateViaCloudApi(to, templateParams)) return true;
    if (await this.sendViaTwilio(to, message)) return true;
    if (await this.sendViaUltramsg(to, message)) return true;
    if (await this.sendViaWebhook(to, message)) return true;
    if (await this.sendViaCallMeBot(to, message)) return true;
    return false;
  }

  async sendTestTo(phoneRaw) {
    const to = settingsService.normalizeWhatsAppNumber(phoneRaw);
    if (!to) throw new Error('Numéro de test invalide.');
    const sent = await this.sendToCustomer(
      { phone: `+${to}`, id: 'test', items: [], total_amount: '0' },
      'Test Nelya : le récapitulatif WhatsApp fonctionne. Les prochaines commandes partiront sur ce numéro si la clé API correspond.',
      ['test', 'TEST', '0']
    );
    if (!sent) {
      throw new Error('Aucun message envoyé. Vérifiez la clé CallMeBot (le numéro testé doit être celui qui a reçu la clé) ou UltraMsg.');
    }
    return { sent: true, to: `+${to}` };
  }

  async sendCustomerConfirmation(order, trackingLink = '') {
    const enabled = await settingsService.getNotifyCustomer();
    if (!enabled) return false;

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
    const enabled = await settingsService.getNotifyCustomer();
    if (!enabled) return false;

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
