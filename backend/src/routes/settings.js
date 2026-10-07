const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middlewares/auth');
const settingsService = require('../services/settingsService');
const permissionService = require('../services/permissionService');

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
    res.json(permissionService.accessPayload(groups));
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    if (req.body.loyaltyTiers !== undefined) {
      await settingsService.setLoyaltyTiers(req.body.loyaltyTiers);
    }
    if (req.body.permissionGroups !== undefined) {
      const groups = await permissionService.setPermissionGroups(req.body.permissionGroups);
      const publicSettings = await settingsService.getPublicSettings();
      return res.json({ ...publicSettings, access: permissionService.accessPayload(groups) });
    }
    res.json(await settingsService.getPublicSettings());
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
