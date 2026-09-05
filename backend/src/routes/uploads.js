const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, authorize } = require('../middlewares/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'img');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    cb(null, `product_${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error("Format d'image non autorisé (jpg, jpeg, png, webp, gif)"));
    }
    cb(null, true);
  }
});

// Upload d'image produit – admins & employés
router.post('/', auth, authorize('admin', 'seller'), (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? "L'image est trop volumineuse (5 Mo max)"
        : err.message;
      return res.status(400).json({ message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier reçu (champ "image")' });
    }
    res.status(201).json({ url: `/img/${req.file.filename}` });
  });
});

module.exports = router;
