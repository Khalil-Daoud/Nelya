const { assertJwtSecret } = require('./jwt');

/**
 * Refuse de démarrer si la configuration est trop incomplète pour être honnête.
 * Un serveur « healthy » avec un mot de passe de base vide n'est pas un serveur prêt.
 */
function assertRuntimeEnv() {
  assertJwtSecret();

  if (!process.env.DB_PASSWORD) {
    throw new Error('DB_PASSWORD est absent.');
  }

  if (process.env.NODE_ENV === 'production') {
    const origin = process.env.ALLOWED_ORIGIN;
    if (!origin) {
      throw new Error(
        'ALLOWED_ORIGIN est obligatoire en production (URL publique du site, ex. https://nelya.tn).'
      );
    }
  }
}

module.exports = { assertRuntimeEnv };
