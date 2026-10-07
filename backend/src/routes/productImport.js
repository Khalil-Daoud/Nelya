const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const JSZip = require('jszip');
const { Op } = require('sequelize');
const { auth, authorize } = require('../middlewares/auth');
const { Product, Category } = require('../models');
const { parseCsv, normalizeHeader, parsePrice } = require('../utils/csv');

const router = express.Router();

const MAX_ROWS = 2000;
const MAX_ZIP_IMAGES = 80;
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const uploadDir = path.join(__dirname, '..', 'img');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.csv', '.txt', '.zip'].includes(ext)) {
      return cb(new Error('Envoyez un CSV, ou un ZIP contenant le CSV et les photos.'));
    }
    cb(null, true);
  }
});

// Un même champ peut s'écrire de plusieurs façons dans le fichier Excel.
const COLUMN_ALIASES = {
  reference: ['ref', 'reference', 'refarticle', 'code', 'codearticle', 'sku'],
  category: ['categorie', 'category', 'famille', 'rayon'],
  name: ['designation', 'designationproduit', 'nom', 'nomproduit', 'libelle', 'produit', 'name'],
  contenance: ['contenance', 'volume', 'poids', 'format', 'taille'],
  price: ['prix', 'price', 'prixttc', 'prixvente', 'prixunitaire', 'pu'],
  image: ['image', 'imageurl', 'urlimage', 'photo', 'lienimage'],
  stock: ['stock', 'quantite', 'qte', 'qty', 'quantity'],
  description: ['description', 'desc', 'details', 'detail']
};

function mapHeaders(headerRow) {
  const mapping = {};
  headerRow.forEach((rawHeader, index) => {
    const normalized = normalizeHeader(rawHeader);
    if (!normalized) return;
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (mapping[field] === undefined && aliases.includes(normalized)) {
        mapping[field] = index;
        return;
      }
    }
  });
  return mapping;
}

// Une cellule "image" peut contenir une URL complète ou juste un nom de fichier
// déjà présent dans /img (uploadé via le formulaire produit).
function normalizeImageUrl(value, packedImages) {
  const text = String(value || '').trim();
  if (!text) return '';
  const base = path.basename(text).toLowerCase();
  if (packedImages && packedImages.has(base)) return packedImages.get(base);
  if (/^https?:\/\//i.test(text)) return text;
  if (text.startsWith('/')) return text;
  return `/img/${text.replace(/^\.?\/+/, '')}`;
}

async function savePackedImage(buffer) {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const converted = await sharp(buffer, { failOn: 'error' })
    .rotate()
    .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const filename = `product_${Date.now()}_${Math.round(Math.random() * 1e9)}_${process.hrtime.bigint()}.webp`;
  await fs.promises.writeFile(path.join(uploadDir, filename), converted);
  return `/img/${filename}`;
}

async function unpackImport(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.zip') {
    return { csvBuffer: file.buffer, packedImages: new Map() };
  }

  const zip = await JSZip.loadAsync(file.buffer);
  const names = Object.keys(zip.files);
  const csvName = names.find((n) => /\.csv$/i.test(n) && !zip.files[n].dir);
  if (!csvName) {
    throw Object.assign(new Error('Le ZIP doit contenir un fichier .csv.'), { status: 400 });
  }

  const csvBuffer = await zip.files[csvName].async('nodebuffer');
  const packedImages = new Map();
  let saved = 0;

  for (const name of names) {
    const entry = zip.files[name];
    if (entry.dir) continue;
    const imageExt = path.extname(name).toLowerCase();
    if (!IMAGE_EXTS.has(imageExt)) continue;
    if (saved >= MAX_ZIP_IMAGES) break;
    const raw = await entry.async('nodebuffer');
    try {
      const url = await savePackedImage(raw);
      packedImages.set(path.basename(name).toLowerCase(), url);
      saved += 1;
    } catch {
      // Fichier nommé comme une image mais illisible : on ignore.
    }
  }

  return { csvBuffer, packedImages };
}

async function resolveCategory(rawName, cache, createdCategories) {
  const name = String(rawName || '').trim();
  if (!name) return '';

  const key = name.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  let category = await Category.findOne({ where: { name: { [Op.iLike]: name } } });
  if (!category) {
    category = await Category.create({ name });
    createdCategories.push(category.name);
  }
  cache.set(key, category.name);
  return category.name;
}

router.post('/import', auth, authorize('admin', 'seller'), (req, res) => {
  upload.single('file')(req, res, async (uploadError) => {
    if (uploadError) {
      const message = uploadError.code === 'LIMIT_FILE_SIZE'
        ? 'Fichier trop volumineux (25 Mo max, ZIP inclus)'
        : uploadError.message;
      return res.status(400).json({ message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier reçu (champ "file")' });
    }

    try {
      const { csvBuffer, packedImages } = await unpackImport(req.file);
      const { rows } = parseCsv(csvBuffer.toString('utf8'));
      if (rows.length < 2) {
        return res.status(400).json({ message: 'Le fichier est vide ou ne contient que les en-têtes' });
      }

      const mapping = mapHeaders(rows[0]);
      const missing = ['name', 'price'].filter((field) => mapping[field] === undefined);
      if (missing.length) {
        return res.status(400).json({
          message: "Colonnes obligatoires introuvables : 'Désignation' et 'Prix'. "
            + `En-têtes lus : ${rows[0].join(' | ')}`
        });
      }

      const dataRows = rows.slice(1);
      if (dataRows.length > MAX_ROWS) {
        return res.status(400).json({ message: `Trop de lignes (${dataRows.length}). Maximum ${MAX_ROWS} par import.` });
      }

      const parsedDefaultStock = Number.parseInt(req.body.default_stock, 10);
      const defaultStock = Number.isFinite(parsedDefaultStock) && parsedDefaultStock >= 0 ? parsedDefaultStock : 0;

      const cell = (row, field) => (mapping[field] === undefined ? '' : String(row[mapping[field]] ?? '').trim());

      const categoryCache = new Map();
      const createdCategories = [];
      const errors = [];
      let created = 0;
      let updated = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const lineNumber = i + 2; // +1 en-tête, +1 pour un numéro de ligne Excel

        try {
          const name = cell(row, 'name');
          const price = parsePrice(cell(row, 'price'));

          if (!name) {
            errors.push({ line: lineNumber, message: 'Désignation vide' });
            continue;
          }
          if (!Number.isFinite(price) || price < 0) {
            errors.push({ line: lineNumber, message: `Prix invalide : "${cell(row, 'price')}"` });
            continue;
          }

          const reference = cell(row, 'reference');
          const rawStock = cell(row, 'stock');
          const parsedStock = Number.parseInt(rawStock, 10);

          const payload = {
            reference: reference || null,
            name,
            contenance: cell(row, 'contenance') || null,
            description: cell(row, 'description') || null,
            price,
            image_url: normalizeImageUrl(cell(row, 'image'), packedImages),
            category: await resolveCategory(cell(row, 'category'), categoryCache, createdCategories)
          };

          // Ré-importer le même fichier met à jour les produits au lieu de les dupliquer.
          const existing = reference
            ? await Product.findOne({ where: { reference } })
            : await Product.findOne({ where: { name: { [Op.iLike]: name } } });

          if (existing) {
            // Le stock se gère dans l'admin : un ré-import ne l'écrase que s'il est dans le fichier.
            if (Number.isFinite(parsedStock) && parsedStock >= 0) payload.stock = parsedStock;
            await existing.update(payload);
            updated++;
          } else {
            payload.stock = Number.isFinite(parsedStock) && parsedStock >= 0 ? parsedStock : defaultStock;
            await Product.create(payload);
            created++;
          }
        } catch (rowError) {
          errors.push({ line: lineNumber, message: rowError.message });
        }
      }

      res.json({
        total: dataRows.length,
        created,
        updated,
        skipped: errors.length,
        imagesImported: packedImages.size,
        categoriesCreated: createdCategories,
        errors: errors.slice(0, 50)
      });
    } catch (error) {
      res.status(400).json({ message: `Lecture du fichier impossible : ${error.message}` });
    }
  });
});

module.exports = router;
