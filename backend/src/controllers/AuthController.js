const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../config/jwt');

// Hash calculé une fois au chargement du module : compare() d'un compte inexistant
// prend alors le même temps qu'un mot de passe faux, ce qui empêche de deviner
// quels emails existent en mesurant la réponse.
const TIMING_DUMMY_HASH = bcrypt.hashSync('nelya-timing-dummy', 10);

// Helper: retirer le mot de passe de la réponse
function sanitizeUser(user) {
  const { password, ...userSafe } = user.toJSON();
  return userSafe;
}

class AuthController {
  static async register(req, res, next) {
    try {
      const { email, password, first_name, last_name } = req.body;
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        await bcrypt.hash(password, 10);
        return res.status(400).json({ message: 'Impossible de créer le compte avec ces informations.' });
      }

      // [SEC-FIX] Mass assignment : whitelist des champs, le rôle est toujours 'client'
      const user = await User.create({ first_name, last_name, email, password });
      const token = signToken({ id: user.id, role: user.role });

      // [BUG-008 FIX] Ne jamais renvoyer le hash du mot de passe
      res.status(201).json({ user: sanitizeUser(user), token });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ where: { email } });
      const hash = user ? user.password : TIMING_DUMMY_HASH;
      const matches = await bcrypt.compare(password, hash);
      if (!user || !matches) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const token = signToken({ id: user.id, role: user.role });

      // [BUG-008 FIX] Ne jamais renvoyer le hash du mot de passe
      res.status(200).json({ user: sanitizeUser(user), token });
    } catch (error) {
      next(error);
    }
  }

  static async me(req, res, next) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
