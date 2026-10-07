require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/database');
const { Product, Order } = require('./models');
const seedData = require('./utils/seeder');
const { assertRuntimeEnv } = require('./config/env');
const { newPublicToken } = require('./utils/orderPublic');

const PORT = process.env.PORT || 3000;
let httpServer;

function shutdown(signal) {
  console.log(`${signal} reçu, arrêt en cours…`);
  const force = setTimeout(() => process.exit(1), 10000);
  if (!httpServer) {
    sequelize.close().finally(() => process.exit(0));
    return;
  }
  httpServer.close(async () => {
    try {
      await sequelize.close();
    } catch (error) {
      console.error('Fermeture de la base :', error.message);
    }
    clearTimeout(force);
    process.exit(0);
  });
}

async function startServer() {
  // Hors du try/catch de la base : un secret invalide n'a rien à voir avec
  // PostgreSQL et doit s'afficher comme tel, sans message trompeur.
  try {
    assertRuntimeEnv();
  } catch (error) {
    console.error('Configuration invalide :', error.message);
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    const { detectFeatures } = require('./config/dbFeatures');
    const dbFeatures = await detectFeatures();
    console.log(`Recherche sans accents: ${dbFeatures.unaccent ? 'activée' : 'désactivée'}.`);

    // Migration légère : ajoute les colonnes manquantes sans framework de migration.
    // Le modèle créé par sync() ci-dessous prend le relais sur une base vierge.
    try {
      await sequelize.query('ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(40)');
      console.log('Schema migration applied (orders.phone).');
    } catch (e) {
      console.warn('Migration orders.phone skipped:', e.message);
    }

    try {
      await sequelize.query('ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "reference" VARCHAR(255)');
      await sequelize.query('ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "contenance" VARCHAR(255)');
      console.log('Schema migration applied (products.reference, products.contenance).');
    } catch (e) {
      console.warn('Migration products.reference/contenance skipped:', e.message);
    }

    try {
      await sequelize.query('ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "guest_name" VARCHAR(255)');
      await sequelize.query('ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "guest_email" VARCHAR(255)');
      await sequelize.query('ALTER TABLE "orders" ALTER COLUMN "user_id" DROP NOT NULL');
      console.log('Schema migration applied (orders.guest_name, orders.guest_email, user_id nullable).');
    } catch (e) {
      console.warn('Migration orders.guest_* skipped:', e.message);
    }

    try {
      await sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "loyalty_points" INTEGER NOT NULL DEFAULT 0');
      await sequelize.query('ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "points_awarded" INTEGER NOT NULL DEFAULT 0');
      console.log('Schema migration applied (users.loyalty_points, orders.points_awarded).');
    } catch (e) {
      console.warn('Migration loyalty columns skipped:', e.message);
    }

    try {
      await sequelize.query('ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "public_token" VARCHAR(64)');
      await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS "orders_public_token_idx" ON "orders" ("public_token")');
      console.log('Schema migration applied (orders.public_token).');
    } catch (e) {
      console.warn('Migration orders.public_token skipped:', e.message);
    }

    // [BUG-005 FIX] sync({ force: false }) ne modifie jamais les données existantes.
    // En production, utiliser des migrations Sequelize (sequelize-cli).
    await sequelize.sync({ force: false });
    console.log('Database synced.');

    // Après sync() : sur une base vierge les tables n'existent pas encore avant.
    // Index exploités par la liste paginée (tri par défaut), le filtre catégorie,
    // la recherche par référence et les jointures des commandes.
    try {
      await sequelize.query('CREATE INDEX IF NOT EXISTS "products_created_at_idx" ON "products" ("created_at" DESC)');
      await sequelize.query('CREATE INDEX IF NOT EXISTS "products_reference_idx" ON "products" ("reference")');
      await sequelize.query('CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products" ("category")');
      await sequelize.query('CREATE INDEX IF NOT EXISTS "orders_user_id_idx" ON "orders" ("user_id")');
      await sequelize.query('CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "orders" ("created_at" DESC)');
      await sequelize.query('CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "order_items" ("order_id")');
      await sequelize.query('CREATE INDEX IF NOT EXISTS "order_items_product_id_idx" ON "order_items" ("product_id")');
      console.log('Indexes ensured (products, orders, order_items).');
    } catch (e) {
      console.warn('Index creation skipped:', e.message);
    }

    try {
      const { Op } = require('sequelize');
      const missing = await Order.findAll({
        where: { [Op.or]: [{ public_token: null }, { public_token: '' }] },
        attributes: ['id']
      });
      for (const row of missing) {
        await row.update({ public_token: newPublicToken() });
      }
      if (missing.length) {
        console.log(`Tokens de suivi générés pour ${missing.length} commande(s).`);
      }
    } catch (e) {
      console.warn('Backfill orders.public_token skipped:', e.message);
    }

    // [BUG-001 FIX] Le seeder ne s'exécute QUE si la base est vide.
    const productCount = await Product.count();
    if (productCount === 0) {
      console.log('Base de données vide, insertion des données initiales...');
      await seedData();
    } else {
      console.log(`Base de données déjà initialisée (${productCount} produits).`);
    }

    httpServer = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
    });

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

startServer();
