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
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  // Mobile / fixe tunisien saisi sans indicatif (8 chiffres) ou avec 0.
  if (digits.length === 9 && digits.startsWith('0')) digits = `216${digits.slice(1)}`;
  if (digits.length === 8) digits = `216${digits}`;
  return digits.length >= 11 ? digits : null;
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

// Le client peut envoyer le récapitulatif à la boutique (lien wa.me). Activé par défaut.
async function getWhatsAppInvite() {
  const setting = await Setting.findByPk('whatsapp_invite');
  if (!setting) return true;
  return setting.value === 'true';
}

async function setWhatsAppInvite(enabled) {
  await Setting.upsert({ key: 'whatsapp_invite', value: enabled ? 'true' : 'false' });
  return enabled;
}

async function getSettingValue(key) {
  const row = await Setting.findByPk(key);
  return row?.value ? String(row.value).trim() : '';
}

async function getCallMeBotKey() {
  return process.env.CALLMEBOT_API_KEY || (await getSettingValue('whatsapp_callmebot_key')) || '';
}

async function getUltramsgConfig() {
  return {
    instance: process.env.WHATSAPP_ULTRAMSG_INSTANCE || (await getSettingValue('whatsapp_ultramsg_instance')) || '',
    token: process.env.WHATSAPP_ULTRAMSG_TOKEN || (await getSettingValue('whatsapp_ultramsg_token')) || ''
  };
}

async function setWhatsAppGateway({ callmebotKey, ultramsgInstance, ultramsgToken } = {}) {
  if (callmebotKey !== undefined) {
    await Setting.upsert({ key: 'whatsapp_callmebot_key', value: String(callmebotKey || '').trim() });
  }
  if (ultramsgInstance !== undefined) {
    await Setting.upsert({ key: 'whatsapp_ultramsg_instance', value: String(ultramsgInstance || '').trim() });
  }
  if (ultramsgToken !== undefined && String(ultramsgToken).trim()) {
    await Setting.upsert({ key: 'whatsapp_ultramsg_token', value: String(ultramsgToken).trim() });
  }
  return getWhatsAppGatewayForAdmin();
}

async function getWhatsAppGatewayForAdmin() {
  const [callmebotKey, ultramsg] = await Promise.all([getCallMeBotKey(), getUltramsgConfig()]);
  return {
    callmebotKey,
    ultramsgInstance: ultramsg.instance,
    ultramsgToken: ultramsg.token,
    ready: Boolean(
      callmebotKey
      || (ultramsg.instance && ultramsg.token)
      || (process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_CLOUD_PHONE_ID)
      || (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM)
      || process.env.WHATSAPP_WEBHOOK_URL
    )
  };
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

const CHECKOUT_FIELD_TYPES = ['text', 'textarea', 'email', 'tel'];
const BUILTIN_CHECKOUT_FIELDS = [
  { id: 'guestName', type: 'text', label: 'Nom et prénom', enabled: true, required: true, builtin: true, guestOnly: true },
  { id: 'guestEmail', type: 'email', label: 'Email', enabled: true, required: true, builtin: true, guestOnly: true },
  { id: 'address', type: 'textarea', label: 'Adresse de livraison', enabled: true, required: true, builtin: true },
  { id: 'phone', type: 'tel', label: 'Numéro de téléphone', enabled: true, required: true, builtin: true },
  { id: 'notes', type: 'textarea', label: 'Remarque', enabled: false, required: false, builtin: true }
];
const BUILTIN_CHECKOUT_IDS = new Set(BUILTIN_CHECKOUT_FIELDS.map((f) => f.id));

function coerceBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return fallback;
}

function normalizeCheckoutFields(raw) {
  const incoming = Array.isArray(raw) ? raw : [];
  const byId = new Map(incoming.filter((f) => f && f.id).map((f) => [String(f.id), f]));
  const builtins = BUILTIN_CHECKOUT_FIELDS.map((def) => {
    const saved = byId.get(def.id) || {};
    return {
      ...def,
      label: String(saved.label || def.label).trim().slice(0, 80) || def.label,
      enabled: coerceBool(saved.enabled, def.enabled),
      required: coerceBool(saved.required, def.required)
    };
  });
  const customs = incoming
    .filter((f) => f && !BUILTIN_CHECKOUT_IDS.has(String(f.id || '')) && String(f.label || '').trim())
    .slice(0, 12)
    .map((f, index) => {
      const type = CHECKOUT_FIELD_TYPES.includes(f.type) ? f.type : 'text';
      const id = String(f.id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || `c_${index}`;
      return {
        id,
        type,
        label: String(f.label).trim().slice(0, 80),
        enabled: coerceBool(f.enabled, true),
        required: coerceBool(f.required, false),
        builtin: false,
        guestOnly: false
      };
    });
  return [...builtins, ...customs];
}

async function getCheckoutFields() {
  const setting = await Setting.findByPk('checkout_fields');
  if (!setting?.value) return normalizeCheckoutFields(BUILTIN_CHECKOUT_FIELDS);
  try {
    return normalizeCheckoutFields(JSON.parse(setting.value));
  } catch {
    return normalizeCheckoutFields(BUILTIN_CHECKOUT_FIELDS);
  }
}

async function setCheckoutFields(raw) {
  const fields = normalizeCheckoutFields(raw);
  await Setting.upsert({ key: 'checkout_fields', value: JSON.stringify(fields) });
  return fields;
}

function fieldById(fields, id) {
  return (fields || []).find((f) => f.id === id) || null;
}

const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&q=80&w=2000';
const DEFAULT_TAGLINE = "L'excellence de la cosmétique naturelle tunisienne. Des soins formulés avec passion pour révéler votre beauté intérieure.";

function normalizeStoreImage(raw, label) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^\/img\/[A-Za-z0-9._-]+$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
  } catch { /* ignore */ }
  throw new Error(`${label} invalide. Envoyez un fichier ou une URL http(s).`);
}

function normalizeHeroImage(raw) {
  return normalizeStoreImage(raw, 'Image d’accueil');
}

async function getSettingOrEmpty(key) {
  const setting = await Setting.findByPk(key);
  return setting?.value || '';
}

async function getHeroImage() {
  return getSettingOrEmpty('hero_image');
}

async function setHeroImage(raw) {
  const value = normalizeHeroImage(raw);
  await Setting.upsert({ key: 'hero_image', value });
  return value;
}

async function getLogo() {
  return getSettingOrEmpty('site_logo');
}

async function setLogo(raw) {
  const value = normalizeStoreImage(raw, 'Logo');
  await Setting.upsert({ key: 'site_logo', value });
  return value;
}

async function getLogoFull() {
  return getSettingOrEmpty('site_logo_full');
}

async function setLogoFull(raw) {
  const value = normalizeStoreImage(raw, 'Logo complet');
  await Setting.upsert({ key: 'site_logo_full', value });
  return value;
}

function normalizeTagline(raw) {
  const value = String(raw || '').replace(/<[^>]*>/g, '').trim();
  if (value.length > 280) {
    throw new Error('Slogan trop long (280 caractères max)');
  }
  return value;
}

async function getTagline() {
  return getSettingOrEmpty('site_tagline');
}

async function setTagline(raw) {
  const value = normalizeTagline(raw);
  await Setting.upsert({ key: 'site_tagline', value });
  return value;
}

const DEFAULT_IDENTITY = {
  slug: 'nelya',
  brand: {
    name: 'Nelya',
    nameStart: 'Nelya',
    nameAccent: '',
    legalName: 'Nelya',
    logo: 'assets/images/nelya-mark.png',
    logoFull: 'assets/images/nelya.png'
  },
  colors: {
    primary: '#c6a04a',
    primaryHover: '#b38d2f',
    secondary: '#0a0a0a'
  },
  contact: {
    email: 'contact@nelya.tn',
    emailOrders: 'commandes@nelya.tn',
    phoneDisplay: '+216 22 580 632',
    whatsapp: '21622580632',
    whatsappLabel: 'WhatsApp',
    hours: 'Du lundi au samedi, 9h – 18h',
    addressLine1: 'Immeuble Khalsa, Hammam Chott',
    addressLine2: 'Tunisie 2084',
    city: 'Hammam Chott',
    country: 'Tunisie'
  },
  social: {
    facebook: 'https://www.facebook.com/profile.php?id=61551180391546',
    instagram: '',
    tiktok: ''
  },
  copy: {
    seoTitle: 'Nelya | Excellence Cosmétique & Soins de Luxe',
    seoDescription: 'Découvrez Nelya, votre boutique en ligne de produits esthétiques haut de gamme. Parfums, soins du visage et maquillage d\'exception.',
    seoKeywords: 'cosmétique, luxe, beauté, soins, parfum, maquillage, Nelya',
    tagline: 'NELYA — TUNISIE',
    heroTitle: "L'Éclat du",
    heroTitleEm: 'Naturel',
    heroSubtitle: 'Des soins botaniques d\'exception, formulés avec passion pour révéler votre beauté intérieure.',
    footerBlurb: DEFAULT_TAGLINE,
    copyrightExtra: 'Conçu avec soin en Tunisie.',
    contactTitle: "Contactez l'atelier Nelya",
    contactIntro: 'Une question sur nos soins, votre commande ou un conseil beauté ? Notre équipe vous répond sous 24h ouvrées.',
    atelierEyebrow: 'Savoir-faire',
    atelierTitle: "L'Atelier Nelya",
    atelierBody: "C'est ici, au cœur de notre atelier, que la magie opère. Nous sélectionnons les essences les plus pures pour créer des soins uniques, respectueux de votre peau et de la nature.",
    atelierImage: '/img/huile.jpg',
    atelierBullets: [
      "Ingrédients d'origine naturelle",
      'Formulation artisanale',
      'Production tunisienne'
    ],
    reviewsTitle: 'La voix de nos clientes',
    reviewSubtitle: 'Partagez votre expérience avec Nelya',
    trustKicker: '100 % naturel  ·  +30 soins exclusifs'
  }
};

function isSafeMediaUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (value.startsWith('assets/')) return value.slice(0, 240);
  if (/^\/img\/[A-Za-z0-9._/-]+$/.test(value)) return value.slice(0, 240);
  if (/^https?:\/\//i.test(value)) return value.slice(0, 500);
  return '';
}

function clip(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function hexColor(value, fallback) {
  const raw = String(value || '').trim();
  if (/^#([0-9A-Fa-f]{6})$/.test(raw)) return raw;
  if (/^#([0-9A-Fa-f]{3})$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return fallback;
}

function httpUrl(value) {
  const raw = clip(value, 400);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString();
  } catch {
    return '';
  }
  return '';
}

function normalizeIdentity(input, defaults = DEFAULT_IDENTITY) {
  const src = input && typeof input === 'object' ? input : {};
  const base = defaults && typeof defaults === 'object' ? defaults : DEFAULT_IDENTITY;
  const brandIn = { ...(base.brand || {}), ...(src.brand || {}) };
  const colorsIn = { ...(base.colors || {}), ...(src.colors || {}) };
  const contactIn = { ...(base.contact || {}), ...(src.contact || {}) };
  const socialIn = { ...(base.social || {}), ...(src.social || {}) };
  const copyIn = { ...(base.copy || {}), ...(src.copy || {}) };

  const copy = {};
  for (const [key, val] of Object.entries(copyIn)) {
    if (key === 'atelierBullets') continue;
    if (typeof val === 'string') {
      copy[key] = clip(val, /body|description|intro|seo/i.test(key) ? 800 : 200);
    }
  }
  copy.atelierBullets = Array.isArray(copyIn.atelierBullets)
    ? copyIn.atelierBullets.map((item) => clip(item, 120)).filter(Boolean).slice(0, 8)
    : [];
  copy.atelierImage = isSafeMediaUrl(copy.atelierImage) || DEFAULT_IDENTITY.copy.atelierImage;

  return {
    slug: clip(base.slug || 'nelya', 40),
    brand: {
      name: clip(brandIn.name, 80) || 'Nelya',
      nameStart: clip(brandIn.nameStart, 40),
      nameAccent: clip(brandIn.nameAccent, 40),
      legalName: clip(brandIn.legalName, 80),
      logo: isSafeMediaUrl(brandIn.logo) || DEFAULT_IDENTITY.brand.logo,
      logoFull: isSafeMediaUrl(brandIn.logoFull) || DEFAULT_IDENTITY.brand.logoFull
    },
    colors: {
      primary: hexColor(colorsIn.primary, '#c6a04a'),
      primaryHover: hexColor(colorsIn.primaryHover, '#b38d2f'),
      secondary: hexColor(colorsIn.secondary, '#0a0a0a')
    },
    contact: {
      email: clip(contactIn.email, 120),
      emailOrders: clip(contactIn.emailOrders, 120),
      phoneDisplay: clip(contactIn.phoneDisplay, 40),
      whatsapp: String(contactIn.whatsapp || '').replace(/\D/g, '').slice(0, 20),
      whatsappLabel: clip(contactIn.whatsappLabel, 40),
      hours: clip(contactIn.hours, 80),
      addressLine1: clip(contactIn.addressLine1, 120),
      addressLine2: clip(contactIn.addressLine2, 120),
      city: clip(contactIn.city, 80),
      country: clip(contactIn.country, 80)
    },
    social: {
      facebook: httpUrl(socialIn.facebook),
      instagram: httpUrl(socialIn.instagram),
      tiktok: httpUrl(socialIn.tiktok)
    },
    copy
  };
}

async function getIdentity() {
  const [row, logo, logoFull, tagline] = await Promise.all([
    Setting.findByPk('identity'),
    getLogo(),
    getLogoFull(),
    getTagline()
  ]);
  let parsed = null;
  if (row?.value) {
    try { parsed = JSON.parse(row.value); } catch { parsed = null; }
  }
  const identity = normalizeIdentity(parsed, DEFAULT_IDENTITY);
  if (logo && identity.brand.logo === DEFAULT_IDENTITY.brand.logo) {
    identity.brand.logo = isSafeMediaUrl(logo) || identity.brand.logo;
  }
  if (logoFull && identity.brand.logoFull === DEFAULT_IDENTITY.brand.logoFull) {
    identity.brand.logoFull = isSafeMediaUrl(logoFull) || identity.brand.logoFull;
  }
  if (tagline && identity.copy.footerBlurb === DEFAULT_IDENTITY.copy.footerBlurb) {
    identity.copy.footerBlurb = tagline;
  }
  return identity;
}

async function setIdentity(raw) {
  const current = await getIdentity();
  const next = normalizeIdentity(raw, current);
  await Setting.upsert({ key: 'identity', value: JSON.stringify(next) });
  await Setting.upsert({ key: 'site_logo', value: next.brand.logo === DEFAULT_IDENTITY.brand.logo ? '' : next.brand.logo });
  await Setting.upsert({ key: 'site_logo_full', value: next.brand.logoFull === DEFAULT_IDENTITY.brand.logoFull ? '' : next.brand.logoFull });
  await Setting.upsert({ key: 'site_tagline', value: next.copy.footerBlurb || '' });
  if (next.contact.whatsapp) {
    try {
      await setWhatsAppNumber(next.contact.whatsapp);
    } catch {
      // L'identité est enregistrée même si le numéro WhatsApp est incomplet.
    }
  }
  return getIdentity();
}

// Écrire spontanément au numéro d'un client exige un fournisseur officiel.
// Les identifiants restent dans les variables d'environnement, jamais en base.
async function isCustomerProviderConfigured() {
  const gateway = await getWhatsAppGatewayForAdmin();
  return gateway.ready;
}

// Réponse publique : aucun secret, uniquement ce dont la boutique a besoin côté navigateur.
async function getPublicSettings() {
  const [currency, guestCheckout, whatsappNumber, notifyCustomer, whatsappInvite, loyaltyTiers, providerReady, checkoutFields, heroImage, identity] = await Promise.all([
    getCurrency(),
    getGuestCheckout(),
    getWhatsAppNumber(),
    getNotifyCustomer(),
    getWhatsAppInvite(),
    getLoyaltyTiers(),
    isCustomerProviderConfigured(),
    getCheckoutFields(),
    getHeroImage(),
    getIdentity()
  ]);

  return {
    currency,
    guestCheckout,
    heroImage: heroImage || DEFAULT_HERO_IMAGE,
    logo: identity.brand.logo || '',
    logoFull: identity.brand.logoFull || '',
    tagline: identity.copy.footerBlurb || DEFAULT_TAGLINE,
    identity,
    checkoutFields,
    loyalty: { tiers: loyaltyTiers },
    whatsapp: {
      number: whatsappNumber,
      invite: whatsappInvite,
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
  getWhatsAppInvite,
  setWhatsAppInvite,
  getCallMeBotKey,
  getUltramsgConfig,
  setWhatsAppGateway,
  getWhatsAppGatewayForAdmin,
  getLoyaltyTiers,
  setLoyaltyTiers,
  getCheckoutFields,
  setCheckoutFields,
  getHeroImage,
  setHeroImage,
  getLogo,
  setLogo,
  getLogoFull,
  setLogoFull,
  getTagline,
  setTagline,
  getIdentity,
  setIdentity,
  fieldById,
  isCustomerProviderConfigured,
  normalizeWhatsAppNumber,
  getPublicSettings,
  CURRENCIES,
  BUILTIN_CHECKOUT_FIELDS,
  DEFAULT_HERO_IMAGE,
  DEFAULT_TAGLINE
};
