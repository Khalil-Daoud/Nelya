const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// [BUG-006 FIX] Modèle Order créé (était référencé dans app.js mais inexistant)
const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Nul pour une commande passée sans compte (voir le paramètre guest_checkout).
  user_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  guest_name: {
    type: DataTypes.STRING
  },
  guest_email: {
    type: DataTypes.STRING
  },
  public_token: {
    type: DataTypes.STRING(64),
    unique: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'),
    defaultValue: 'pending'
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  shipping_address: {
    type: DataTypes.TEXT
  },
  phone: {
    type: DataTypes.STRING(40)
  },
  notes: {
    type: DataTypes.TEXT
  },
  points_awarded: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  timestamps: true,
  underscored: true
});

module.exports = Order;
