class BaseController {
  constructor(service) {
    this.service = service;
  }

  getAll = async (req, res, next) => {
    try {
      const items = await this.service.getAll(req.query);
      res.status(200).json(items);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const item = await this.service.getById(req.params.id);
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }
      res.status(200).json(item);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const item = await this.service.create(req.body);
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const item = await this.service.update(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }
      res.status(200).json(item);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      const result = await this.service.delete(req.params.id);
      if (!result) {
        return res.status(404).json({ message: 'Item not found' });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = BaseController;
