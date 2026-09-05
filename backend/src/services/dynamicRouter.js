const express = require('express');
const BaseService = require('./BaseService');
const models = require('../models');
const { auth, authorize } = require('../middlewares/auth');

// [SEC-FIX] Configuration par modèle : contrôle fin de ce qui est lisible/écrivable
const MODEL_CONFIG = {
  Product: {
    publicRead: true,
    writeFields: ['name', 'description', 'price', 'stock', 'image_url', 'category'],
  },
  Category: {
    publicRead: true,
    writeFields: ['name', 'description'],
  },
  User: {
    publicRead: false,
    writeFields: ['first_name', 'last_name', 'email', 'password', 'role'],
    readExclude: ['password'],
  },
};

function pickFields(body, fields) {
  const out = {};
  if (!fields) return body;
  for (const field of fields) {
    if (field in body) out[field] = body[field];
  }
  return out;
}

function sanitize(modelName, data) {
  const config = MODEL_CONFIG[modelName] || {};
  if (!config.readExclude || data === null || data === undefined) return data;
  const clean = (item) => {
    const json = item && typeof item.toJSON === 'function' ? item.toJSON() : item;
    for (const field of config.readExclude) delete json[field];
    return json;
  };
  return Array.isArray(data) ? data.map(clean) : clean(data);
}

/**
 * Crée un routeur Express dynamique pour un modèle Sequelize donné.
 * @param {string} modelName - Le nom du modèle (ex: 'Product', 'Order', 'User')
 * @returns {Router} - Un routeur Express configuré avec les opérations CRUD de base.
 */
function createDynamicRouter(modelName) {
  const router = express.Router();
  const service = new BaseService(models[modelName]);
  const config = MODEL_CONFIG[modelName] || {};

  // [BUG-003 FIX] Routes publiques uniquement pour les produits, sécurisées pour le reste
  const checkReadAuth = (req, res, next) => {
    if (config.publicRead) return next();
    return auth(req, res, () => {
      authorize('admin', 'seller')(req, res, next);
    });
  };

  const getReadOptions = () => {
    return config.readExclude ? { attributes: { exclude: config.readExclude } } : {};
  };

  // [SEC-FIX] Corps limité aux champs autorisés + rôle protégé (admin uniquement)
  const getWriteBody = (req, res) => {
    const data = pickFields(req.body, config.writeFields);
    if (modelName === 'User' && 'role' in data && req.user.role !== 'admin') {
      res.status(403).json({ message: 'Seul un administrateur peut modifier le rôle' });
      return null;
    }
    if (modelName === 'User' && 'password' in data && req.user.role !== 'admin') {
      res.status(403).json({ message: 'Seul un administrateur peut modifier le mot de passe' });
      return null;
    }
    return data;
  };

  router.get('/', checkReadAuth, async (req, res) => {
    try {
      const data = await service.getAll(getReadOptions());
      res.json(sanitize(modelName, data));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/:id', checkReadAuth, async (req, res) => {
    try {
      const data = await service.getById(req.params.id, getReadOptions());
      if (!data) return res.status(404).json({ message: 'Not found' });
      res.json(sanitize(modelName, data));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // [BUG-003 FIX] Création : authentifié + rôle admin ou seller
  router.post('/', auth, authorize('admin', 'seller'), async (req, res) => {
    try {
      const data = getWriteBody(req, res);
      if (data === null) return;
      const created = await service.create(data);
      res.status(201).json(sanitize(modelName, created));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // [BUG-003 FIX] Modification : authentifié + rôle admin ou seller
  router.put('/:id', auth, authorize('admin', 'seller'), async (req, res) => {
    try {
      const data = getWriteBody(req, res);
      if (data === null) return;
      const updated = await service.update(req.params.id, data);
      if (!updated) return res.status(404).json({ message: 'Not found' });
      const fresh = await service.getById(req.params.id, getReadOptions());
      res.json(sanitize(modelName, fresh));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // [BUG-003 FIX] Suppression : authentifié + rôle admin uniquement
  router.delete('/:id', auth, authorize('admin'), async (req, res) => {
    try {
      const deleted = await service.delete(req.params.id);
      if (!deleted) return res.status(404).json({ message: 'Not found' });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createDynamicRouter;
