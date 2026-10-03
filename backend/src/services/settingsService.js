const Setting = require('../models/Setting');

const CURRENCIES = {
  EUR: { code: 'EUR', symbol: '€', label: 'Euro' },
  USD: { code: 'USD', symbol: '$', label: 'Dollar US' },
  TND: { code: 'TND', symbol: 'DT', label: 'Dinar Tunisien' }
};

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

async function getPublicSettings() {
  const [currency, guestCheckout] = await Promise.all([getCurrency(), getGuestCheckout()]);
  return { currency, guestCheckout };
}

module.exports = {
  getCurrency,
  setCurrency,
  getGuestCheckout,
  setGuestCheckout,
  getPublicSettings,
  CURRENCIES
};
