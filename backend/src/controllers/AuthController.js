const User = require('../models/User');
const jwt = require('jsonwebtoken');

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
        return res.status(400).json({ message: 'User already exists' });
      }

      // [SEC-FIX] Mass assignment : whitelist des champs, le rôle est toujours 'client'
      const user = await User.create({ first_name, last_name, email, password });
      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

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
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

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
