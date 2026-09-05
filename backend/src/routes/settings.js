const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middlewares/auth');
const settingsService = require('../services/settingsService');

// Paramètres publics de la boutique (devise, etc.)
router.get('/', async (req, res) => {
  try {
    res.json(await settingsService.getCurrency());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mise à jour des paramètres – admin uniquement
router.put('/', auth, authorize('admin'), async (req, res) => {
  try {
    const currency = await settingsService.setCurrency(req.body.currency);
    res.json(currency);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
