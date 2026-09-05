const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const createDynamicRouter = require('./services/dynamicRouter');
const rateLimit = require('express-rate-limit');

const app = express();

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "http://localhost:3000", "https://images.unsplash.com"],
    },
  },
}));
// [BUG-004 FIX] CORS restreint - mettre l'URL frontend dans ALLOWED_ORIGIN
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:4200',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

// Images Statiques
app.use('/img', express.static(path.join(__dirname, 'img')));

// Upload d'images (produits) – admin & employés
app.use('/api/uploads', require('./routes/uploads'));

// Routes Dynamiques
app.use('/api/products', createDynamicRouter('Product'));
app.use('/api/categories', createDynamicRouter('Category'));
app.use('/api/users', createDynamicRouter('User'));

// [SEC-FIX] Route commandes dédiée (calcul serveur du total, items, accès client)
app.use('/api/orders', require('./routes/orders'));

// Paramètres boutique (devise)
app.use('/api/settings', require('./routes/settings'));

// Auth Routes (à implémenter si séparées)
const authController = require('./controllers/AuthController');
const { validateRegister, validateLogin } = require('./middlewares/validation');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limite chaque IP à 10 requêtes
  message: { message: 'Trop de requêtes depuis cette IP, veuillez réessayer après 15 minutes' }
});

app.post('/api/auth/register', authLimiter, validateRegister, authController.register);
app.post('/api/auth/login', authLimiter, validateLogin, authController.login);

app.get('/', (req, res) => {
  res.json({ message: 'Nelya API is running' });
});

// Health check endpoint pour le monitoring
app.get('/api/health', async (req, res) => {
  try {
    // Vérifier la connexion à la base de données
    const sequelize = require('./config/database');
    await sequelize.authenticate();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

module.exports = app;
