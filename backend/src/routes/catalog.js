const express = require('express');
const { fn, col, Op } = require('sequelize');
const { Product, Category } = require('../models');

const router = express.Router();

function countMap(rows, key) {
  const out = new Map();
  for (const row of rows) {
    const name = String(row[key] || '').trim();
    if (name) out.set(name, Number(row.count) || 0);
  }
  return out;
}

// Les bornes du filtre prix et l'arbre catégories / sous-catégories se
// calculaient côté client à partir du catalogue entier.
router.get('/meta', async (req, res, next) => {
  try {
    const [totals, defined, catCounts, subCounts, images] = await Promise.all([
      Product.findOne({
        attributes: [
          [fn('COUNT', col('id')), 'count'],
          [fn('MIN', col('price')), 'minPrice'],
          [fn('MAX', col('price')), 'maxPrice']
        ],
        raw: true
      }),
      Category.findAll({
        attributes: ['id', 'name', 'parent_id'],
        order: [['name', 'ASC']],
        raw: true
      }),
      Product.findAll({
        attributes: ['category', [fn('COUNT', col('id')), 'count']],
        where: { category: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] } },
        group: ['category'],
        raw: true
      }),
      Product.findAll({
        attributes: ['subcategory', [fn('COUNT', col('id')), 'count']],
        where: { subcategory: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] } },
        group: ['subcategory'],
        raw: true
      }),
      Product.sequelize.query(
        `SELECT c.category AS name, p.image_url AS image
           FROM (SELECT DISTINCT category
                   FROM products
                  WHERE category IS NOT NULL AND category <> '') c
           LEFT JOIN (SELECT DISTINCT ON (category) category, image_url
                        FROM products
                       WHERE category IS NOT NULL AND category <> ''
                         AND image_url IS NOT NULL AND image_url <> ''
                       ORDER BY category, created_at DESC) p
             ON p.category = c.category`,
        { type: Product.sequelize.QueryTypes.SELECT }
      )
    ]);

    const byCat = countMap(catCounts, 'category');
    const bySub = countMap(subCounts, 'subcategory');
    const imageByCat = new Map(images.map((row) => [row.name, row.image || null]));
    const childrenByParent = new Map();
    const known = new Set();

    for (const cat of defined) {
      known.add(cat.name);
      const key = cat.parent_id || '';
      if (!childrenByParent.has(key)) childrenByParent.set(key, []);
      childrenByParent.get(key).push(cat);
    }

    const roots = [...(childrenByParent.get('') || [])];
    for (const name of byCat.keys()) {
      if (!known.has(name)) roots.push({ id: null, name, parent_id: null });
    }
    roots.sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    const categories = roots.map((root) => {
      const children = (root.id ? (childrenByParent.get(root.id) || []) : []).map((child) => ({
        name: child.name,
        count: bySub.get(child.name) || 0,
        image: null,
        children: []
      }));
      return {
        name: root.name,
        count: byCat.get(root.name) || 0,
        image: imageByCat.get(root.name) || null,
        children
      };
    });

    res.json({
      count: Number(totals?.count || 0),
      minPrice: Number(totals?.minPrice || 0),
      maxPrice: Number(totals?.maxPrice || 0),
      categories
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
