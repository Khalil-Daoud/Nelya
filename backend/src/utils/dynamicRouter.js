const express = require('express');
const BaseService = require('../services/BaseService');
const BaseController = require('../controllers/BaseController');

/**
 * Creates a standard CRUD router for a given model
 * @param {import('sequelize').Model} model 
 * @param {Function[]} middlewares - Optional middlewares to apply to all routes
 * @returns {import('express').Router}
 */
function createDynamicRouter(model, middlewares = []) {
  const router = express.Router();
  const service = new BaseService(model);
  const controller = new BaseController(service);

  if (middlewares && middlewares.length > 0) {
    router.use(middlewares);
  }

  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.post('/', controller.create);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.delete);

  return router;
}

module.exports = createDynamicRouter;
