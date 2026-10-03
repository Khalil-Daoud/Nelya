const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middlewares/auth');
const settingsService = require('../services/settingsService');

// Paramètres publics de la boutique (devise, commande sans compte)
router.get('/', async (req, res) => {
  try {
    res.json(await settingsService.getPublicSettings());
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
    res.json(await settingsService.getPublicSettings());
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
