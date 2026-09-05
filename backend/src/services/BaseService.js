class BaseService {
  constructor(model) {
    this.model = model;
  }

  async getAll(query = {}) {
    try {
      return await this.model.findAll(query);
    } catch (error) {
      throw error;
    }
  }

  async getById(id, options = {}) {
    try {
      return await this.model.findByPk(id, options);
    } catch (error) {
      throw error;
    }
  }

  async create(data) {
    try {
      return await this.model.create(data);
    } catch (error) {
      throw error;
    }
  }

  async update(id, data) {
    try {
      const item = await this.model.findByPk(id);
      if (!item) return null;
      return await item.update(data);
    } catch (error) {
      throw error;
    }
  }

  async delete(id) {
    try {
      const item = await this.model.findByPk(id);
      if (!item) return null;
      await item.destroy();
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = BaseService;
