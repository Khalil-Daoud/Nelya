require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/database');
const { Product } = require('./models');
const seedData = require('./utils/seeder');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

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

    // [BUG-005 FIX] sync({ force: false }) ne modifie jamais les données existantes.
    // En production, utiliser des migrations Sequelize (sequelize-cli).
    await sequelize.sync({ force: false });
    console.log('Database synced.');

    // [BUG-001 FIX] Le seeder ne s'exécute QUE si la base est vide.
    const productCount = await Product.count();
    if (productCount === 0) {
      console.log('Base de données vide, insertion des données initiales...');
      await seedData();
    } else {
      console.log(`Base de données déjà initialisée (${productCount} produits).`);
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

startServer();
