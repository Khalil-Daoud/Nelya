const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { auth, optionalAuth, authorize } = require('../middlewares/auth');
const { Order, OrderItem, Product, User, sequelize } = require('../models');
const whatsappService = require('../services/whatsappService');
const settingsService = require('../services/settingsService');

// Les commandes invité sont anonymes et décrémentent le stock : on plafonne par IP.
const guestOrderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  skip: (req) => Boolean(req.user),
  message: { message: 'Trop de commandes depuis cette adresse. Réessayez plus tard.' }
});

// Create a new order – authenticated users, plus guests when the shop allows it.
// [SEC-FIX] Le montant est calculé côté serveur à partir des prix en base.
// L'utilisateur est déduit du token (jamais du body). Les items sont créés.
router.post('/', optionalAuth, guestOrderLimiter, async (req, res) => {
  const { items, shipping_address, phone, notes, guest_name, guest_email } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Order must contain at least one item' });
  }

  let guest = null;
  if (!req.user) {
    if (!(await settingsService.getGuestCheckout())) {
      return res.status(401).json({ message: 'Veuillez vous connecter pour valider votre commande.' });
    }
    const name = String(guest_name || '').trim();
    if (!name) {
      return res.status(400).json({ message: 'Le nom est obligatoire pour commander sans compte.' });
    }
    if (!String(phone || '').trim()) {
      return res.status(400).json({ message: 'Le téléphone est obligatoire pour commander sans compte.' });
    }
    guest = { name, email: String(guest_email || '').trim() || null };
  }

  try {
    const newOrder = await sequelize.transaction(async (t) => {
      const orderItemsData = [];
      let total = 0;

      for (const item of items) {
        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new Error('Quantité invalide');
        }
        const product = await Product.findByPk(item.product_id, { transaction: t });
        if (!product) {
          throw new Error('Produit introuvable');
        }
        if (product.stock < quantity) {
          throw new Error(`Stock insuffisant pour "${product.name}"`);
        }
        const unitPrice = Number(product.price);
        total += unitPrice * quantity;
        orderItemsData.push({
          product_id: product.id,
          quantity,
          unit_price: unitPrice
        });
        await product.update({ stock: product.stock - quantity }, { transaction: t });
      }

      const order = await Order.create({
        user_id: req.user ? req.user.id : null,
        guest_name: guest ? guest.name : null,
        guest_email: guest ? guest.email : null,
        total_amount: total.toFixed(2),
        shipping_address,
        phone,
        notes,
        status: 'pending'
      }, { transaction: t });

      await OrderItem.bulkCreate(
        orderItemsData.map(item => ({ ...item, order_id: order.id })),
        { transaction: t }
      );

      return order;
    });

    // Fetch the full order with relations for the notification
    const fullOrder = await Order.findByPk(newOrder.id, {
      include: [
        { model: User, as: 'User' },
        { model: OrderItem, as: 'items', include: [{ model: Product }] }
      ]
    });

    // Send WhatsApp notification (non‑blocking)
    whatsappService.sendOrderNotification(fullOrder).catch(err => console.error('[WhatsApp] send error', err));

    return res.status(201).json(fullOrder);
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Erreur lors de la création de la commande' });
  }
});

// Update order status – admins & sellers only
router.put('/:id', auth, authorize('admin', 'seller'), async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const allowedStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (req.body.status && !allowedStatuses.includes(req.body.status)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    await order.update({ status: req.body.status });
    res.json(order);
  } catch (err) {
    return res.status(400).json({ message: err.message || 'Erreur lors de la mise à jour' });
  }
});

// Get list of orders – admins & sellers see all, clients see only theirs
router.get('/', auth, async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role === 'client') {
      where.user_id = req.user.id;
    }
    const orders = await Order.findAll({
      where,
      include: [
        { model: User, as: 'User' },
        { model: OrderItem, as: 'items', include: [{ model: Product }] }
      ]
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// Get a single order – same access rules as list
router.get('/:id', auth, async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: User, as: 'User' },
        { model: OrderItem, as: 'items', include: [{ model: Product }] }
      ]
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.role === 'client' && order.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
