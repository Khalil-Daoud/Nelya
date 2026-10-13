const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT
  },
  parent_id: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  timestamps: true,
  underscored: true
});

async function assertValidParent(instance) {
  if (!instance.parent_id) {
    instance.parent_id = null;
    return;
  }
  if (instance.id && instance.parent_id === instance.id) {
    throw new Error('Une catégorie ne peut pas être sa propre parente.');
  }
  const parent = await Category.findByPk(instance.parent_id);
  if (!parent) {
    throw new Error('Catégorie parente introuvable.');
  }
  if (parent.parent_id) {
    throw new Error('Une sous-catégorie ne peut pas avoir d’enfants. Un seul niveau.');
  }
  if (instance.id) {
    const kids = await Category.count({ where: { parent_id: instance.id } });
    if (kids > 0) {
      throw new Error('Cette catégorie a déjà des sous-catégories : retirez-les avant de la déplacer.');
    }
  }
}

Category.beforeValidate(assertValidParent);

module.exports = Category;
