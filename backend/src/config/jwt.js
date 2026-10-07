const jwt = require('jsonwebtoken');

// Épingler l'algorithme est ce qui empêche un jeton forgé avec "alg": "none" ou signé
// en RS256 avec une clé publique connue d'être accepté à la vérification.
const ALGORITHM = 'HS256';
const ISSUER = 'nelya-api';
const MIN_SECRET_LENGTH = 32;

/**
 * À appeler au démarrage. Un secret absent ou trivial rend toute l'authentification
 * décorative : mieux vaut refuser de démarrer que servir des jetons faux-signés.
 */
function assertJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET est absent. Générez-en un avec: openssl rand -hex 32');
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET fait ${secret.length} caractères, ${MIN_SECRET_LENGTH} au minimum sont requis.`
    );
  }
  const weak = ['secret', 'changeme', 'jwt_secret', 'your_jwt_secret', 'nelya'];
  if (weak.includes(secret.toLowerCase())) {
    throw new Error('JWT_SECRET est une valeur d\'exemple. Remplacez-la par un secret aléatoire.');
  }
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    algorithm: ALGORITHM,
    issuer: ISSUER,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: [ALGORITHM],
    issuer: ISSUER
  });
}

module.exports = { assertJwtSecret, signToken, verifyToken, ALGORITHM, ISSUER };
