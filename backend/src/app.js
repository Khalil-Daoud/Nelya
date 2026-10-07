const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const createDynamicRouter = require('./services/dynamicRouter');
const rateLimit = require('express-rate-limit');

const app = express();

// Derrière Nginx, req.ip vaut sinon l'IP du proxy : tous les visiteurs partagent alors
// le même compteur et les limiteurs de débit protègent ou bloquent tout le monde en bloc.
app.set('trust proxy', 1);

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: process.env.NODE_ENV === 'production'
        ? ["'self'", "data:", "https:"]
        : ["'self'", "data:", "http://localhost:3000", "https://images.unsplash.com"],
    },
  },
}));
// [BUG-004 FIX] CORS restreint - mettre l'URL frontend dans ALLOWED_ORIGIN
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:4200')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error('Origine CORS refusée'));
  },
  credentials: true
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());

// Images Statiques
app.use('/img', express.static(path.join(__dirname, 'img')));

// Upload d'images (produits) – admin & employés
app.use('/api/uploads', require('./routes/uploads'));

// Import CSV de produits – doit être monté avant le routeur dynamique
app.use('/api/products', require('./routes/productImport'));

// Agrégats du catalogue (/api/products/meta) – avant le routeur dynamique,
// sinon "meta" serait interprété comme un identifiant par la route /:id
app.use('/api/products', require('./routes/catalog'));
app.use('/api/products', require('./routes/stock'));

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
const { auth } = require('./middlewares/auth');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limite chaque IP à 10 requêtes
  message: { message: 'Trop de requêtes depuis cette IP, veuillez réessayer après 15 minutes' }
});

app.post('/api/auth/register', authLimiter, validateRegister, authController.register);
app.post('/api/auth/login', authLimiter, validateLogin, authController.login);
app.get('/api/auth/me', auth, authController.me);

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

// Sans ce gestionnaire, un next(error) depuis un contrôleur laissait la requête ouverte
// jusqu'au timeout du navigateur au lieu de répondre. Doit rester en dernier.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err.stack || err.message);
  if (res.headersSent) return;
  // Le détail de l'erreur peut révéler la structure de la base : réservé au développement.
  const payload = { message: 'Une erreur interne est survenue' };
  if (process.env.NODE_ENV !== 'production') {
    payload.error = err.message;
  }
  res.status(err.status || 500).json(payload);
});

module.exports = app;
