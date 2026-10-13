const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middlewares/auth');
const settingsService = require('../services/settingsService');
const permissionService = require('../services/permissionService');
const audit = require('../services/auditService');

const SETTING_LABELS = {
  currency: 'la devise',
  guestCheckout: 'la commande invité',
  whatsappNumber: 'le numéro WhatsApp',
  notifyCustomer: 'l’envoi WhatsApp client',
  whatsappInvite: 'l’invitation WhatsApp boutique',
  callmebotKey: 'la clé WhatsApp',
  ultramsgInstance: 'UltraMsg',
  ultramsgToken: 'UltraMsg',
  loyaltyTiers: 'la fidélité',
  checkoutFields: 'les champs de commande',
  heroImage: 'l’image d’accueil',
  logo: 'le logo',
  logoFull: 'le logo complet',
  tagline: 'le slogan',
  identity: 'l’identité du site',
  permissionGroups: 'les groupes de permissions'
};

// Paramètres publics de la boutique (devise, commande sans compte)
router.get('/', async (req, res) => {
  try {
    res.json(await settingsService.getPublicSettings());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/access', auth, authorize('admin'), async (req, res) => {
  try {
    const groups = await permissionService.getPermissionGroups();
    const whatsappGateway = await settingsService.getWhatsAppGatewayForAdmin();
    res.json({ ...permissionService.accessPayload(groups), whatsappGateway });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/whatsapp-test', auth, authorize('admin'), async (req, res) => {
  try {
    const whatsappService = require('../services/whatsappService');
    res.json(await whatsappService.sendTestTo(req.body.phone));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Mise à jour des paramètres – admin uniquement
router.put('/', auth, authorize('admin'), async (req, res) => {
  try {
    if (req.body.currency !== undefined) {
      await settingsService.setCurrency(req.body.currency);
    }
    if (req.body.guestCheckout !== undefined) {
      await settingsService.setGuestCheckout(req.body.guestCheckout === true || req.body.guestCheckout === 'true');
    }
    if (req.body.whatsappNumber !== undefined) {
      await settingsService.setWhatsAppNumber(req.body.whatsappNumber);
    }
    if (req.body.notifyCustomer !== undefined) {
      await settingsService.setNotifyCustomer(req.body.notifyCustomer === true || req.body.notifyCustomer === 'true');
    }
    if (req.body.whatsappInvite !== undefined) {
      await settingsService.setWhatsAppInvite(req.body.whatsappInvite === true || req.body.whatsappInvite === 'true');
    }
    if (req.body.callmebotKey !== undefined || req.body.ultramsgInstance !== undefined || req.body.ultramsgToken !== undefined) {
      await settingsService.setWhatsAppGateway({
        callmebotKey: req.body.callmebotKey,
        ultramsgInstance: req.body.ultramsgInstance,
        ultramsgToken: req.body.ultramsgToken
      });
    }
    if (req.body.loyaltyTiers !== undefined) {
      await settingsService.setLoyaltyTiers(req.body.loyaltyTiers);
    }
    if (req.body.checkoutFields !== undefined) {
      await settingsService.setCheckoutFields(req.body.checkoutFields);
    }
    if (req.body.heroImage !== undefined) {
      await settingsService.setHeroImage(req.body.heroImage);
    }
    if (req.body.logo !== undefined) {
      await settingsService.setLogo(req.body.logo);
    }
    if (req.body.logoFull !== undefined) {
      await settingsService.setLogoFull(req.body.logoFull);
    }
    if (req.body.tagline !== undefined) {
      await settingsService.setTagline(req.body.tagline);
    }
    if (req.body.identity !== undefined) {
      await settingsService.setIdentity(req.body.identity);
    }
    const changed = Object.keys(req.body).filter((key) => SETTING_LABELS[key]);
    const summary = changed.includes('permissionGroups')
      ? 'a modifié les groupes de permissions'
      : changed.length
        ? `a modifié ${changed.map((key) => SETTING_LABELS[key]).join(', ')}`
        : 'a modifié les paramètres';

    if (req.body.permissionGroups !== undefined) {
      const groups = await permissionService.setPermissionGroups(req.body.permissionGroups);
      audit.log({ req, action: 'settings.update', entity: 'settings', summary });
      const publicSettings = await settingsService.getPublicSettings();
      return res.json({ ...publicSettings, access: permissionService.accessPayload(groups) });
    }
    audit.log({ req, action: 'settings.update', entity: 'settings', summary });
    res.json(await settingsService.getPublicSettings());
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
