require('dotenv').config();
const models = require('../models');

// Crée le premier administrateur depuis les variables d'environnement.
// Usage : npm run create-admin   (ADMIN_EMAIL et ADMIN_PASSWORD requis)
async function createAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis (voir .env).');
    process.exit(1);
  }

  await models.sequelize.sync();

  const existing = await models.User.findOne({ where: { email } });
  if (existing) {
    console.log(`Un utilisateur avec l'email ${email} existe déjà.`);
    process.exit(0);
  }

  await models.User.create({
    first_name: 'Admin',
    last_name: 'Nelya',
    email,
    password,
    role: 'admin'
  });

  console.log(`Administrateur créé : ${email}`);
  process.exit(0);
}

createAdmin().catch((error) => {
  console.error('Erreur lors de la création de l\'administrateur :', error);
  process.exit(1);
});
