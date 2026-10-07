const sequelize = require('./database');

// Capacités détectées au démarrage. Le code de requête s'y adapte au lieu de
// supposer qu'une extension PostgreSQL est forcément installée.
const features = {
  unaccent: false
};

/**
 * unaccent permet à « deodorant » de trouver « Déodorant ». Sans cette extension
 * une cliente qui tape sans accents ne trouve rien, ce qui est le cas le plus courant
 * sur mobile. L'extension fait partie de postgresql-contrib, présent dans l'image
 * officielle ; sa création nécessite cependant les droits superutilisateur.
 */
async function detectFeatures() {
  try {
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS unaccent');
    features.unaccent = true;
  } catch (error) {
    features.unaccent = false;
    console.warn('Extension unaccent indisponible, recherche sensible aux accents:', error.message);
  }
  return features;
}

module.exports = { features, detectFeatures };
