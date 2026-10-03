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
  }
}, {
  timestamps: true,
  underscored: true
});

module.exports = Order;
