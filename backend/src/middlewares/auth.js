const { verifyToken } = require('../config/jwt');

function readBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim() || null;
}

const auth = (req, res, next) => {
  const token = readBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Laisse passer les requêtes anonymes mais renseigne req.user si un token valide est fourni.
// Un token présent mais invalide reste une erreur : on ne dégrade pas silencieusement en invité.
const optionalAuth = (req, res, next) => {
  const token = readBearerToken(req);
  if (!token) {
    return next();
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    // Garde-fou : si authorize est monté sans auth devant, on refuse au lieu de
    // lever un TypeError sur req.user.role, qui remonterait en 500.
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: You do not have the required role' });
    }
    next();
  };
};

module.exports = { auth, optionalAuth, authorize };
