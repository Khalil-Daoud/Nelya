const Setting = require('../models/Setting');
const loyaltyService = require('./loyaltyService');

const CURRENCIES = {
  EUR: { code: 'EUR', symbol: '€', label: 'Euro' },
  USD: { code: 'USD', symbol: '$', label: 'Dollar US' },
  TND: { code: 'TND', symbol: 'DT', label: 'Dinar Tunisien' }
};

// Numéro affiché dans le pied de page et la page contact du site.
const DEFAULT_WHATSAPP_NUMBER = '21621085186';

async function getCurrency() {
  const setting = await Setting.findByPk('currency');
  const code = setting?.value || 'EUR';
  return CURRENCIES[code] || CURRENCIES.EUR;
}

async function setCurrency(code) {
  if (!CURRENCIES[code]) {
    throw new Error('Devise invalide. Valeurs autorisées : EUR, USD, TND');
  }
  await Setting.upsert({ key: 'currency', value: code });
  return CURRENCIES[code];
}

// Commande sans compte : désactivée par défaut (le client doit se connecter).
async function getGuestCheckout() {
  const setting = await Setting.findByPk('guest_checkout');
  return setting?.value === 'true';
}

async function setGuestCheckout(enabled) {
  await Setting.upsert({ key: 'guest_checkout', value: enabled ? 'true' : 'false' });
  return enabled;
}

// WhatsApp attend un numéro international sans "+" ni séparateur : 21622580632
function normalizeWhatsAppNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length >= 8 ? digits : null;
}

async function getWhatsAppNumber() {
  const setting = await Setting.findByPk('whatsapp_number');
  return setting?.value || normalizeWhatsAppNumber(process.env.WHATSAPP_TO_NUMBER) || DEFAULT_WHATSAPP_NUMBER;
}

async function setWhatsAppNumber(raw) {
  const number = normalizeWhatsAppNumber(raw);
  if (!number) {
    throw new Error('Numéro WhatsApp invalide. Indiquez l’indicatif pays, ex : +216 22 580 632');
  }
  await Setting.upsert({ key: 'whatsapp_number', value: number });
  return number;
}

async function getNotifyCustomer() {
  const setting = await Setting.findByPk('whatsapp_notify_customer');
  return setting?.value === 'true';
}

async function setNotifyCustomer(enabled) {
  await Setting.upsert({ key: 'whatsapp_notify_customer', value: enabled ? 'true' : 'false' });
  return enabled;
}

async function getLoyaltyTiers() {
  const setting = await Setting.findByPk('loyalty_tiers');
  if (!setting?.value) return loyaltyService.DEFAULT_TIERS;
  try {
    return loyaltyService.normalizeTiers(JSON.parse(setting.value));
  } catch {
    return loyaltyService.DEFAULT_TIERS;
  }
}

async function setLoyaltyTiers(raw) {
  const tiers = loyaltyService.normalizeTiers(raw);
  await Setting.upsert({ key: 'loyalty_tiers', value: JSON.stringify(tiers) });
  return tiers;
}

// Écrire spontanément au numéro d'un client exige un fournisseur officiel.
// Les identifiants restent dans les variables d'environnement, jamais en base.
function isCustomerProviderConfigured() {
  const meta = Boolean(process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_CLOUD_PHONE_ID);
  const twilio = Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM
  );
  return meta || twilio;
}

// Réponse publique : aucun secret, uniquement ce dont la boutique a besoin côté navigateur.
async function getPublicSettings() {
  const [currency, guestCheckout, whatsappNumber, notifyCustomer, loyaltyTiers] = await Promise.all([
    getCurrency(),
    getGuestCheckout(),
    getWhatsAppNumber(),
    getNotifyCustomer(),
    getLoyaltyTiers()
  ]);

  const providerReady = isCustomerProviderConfigured();

  return {
    currency,
    guestCheckout,
    loyalty: { tiers: loyaltyTiers },
    whatsapp: {
      number: whatsappNumber,
      notifyCustomer,
      providerReady,
      // Quand l'envoi automatique fonctionne, le site n'a plus besoin de rediriger le client.
      autoSend: notifyCustomer && providerReady
    }
  };
}

module.exports = {
  getCurrency,
  setCurrency,
  getGuestCheckout,
  setGuestCheckout,
  getWhatsAppNumber,
  setWhatsAppNumber,
  getNotifyCustomer,
  setNotifyCustomer,
  getLoyaltyTiers,
  setLoyaltyTiers,
  isCustomerProviderConfigured,
  normalizeWhatsAppNumber,
  getPublicSettings,
  CURRENCIES
};
