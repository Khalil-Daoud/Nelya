const express = require('express');
const { fn, col } = require('sequelize');
const { Product } = require('../models');

const router = express.Router();

// Les bornes du filtre prix et la liste des catégories se calculaient côté client à
// partir du catalogue entier. Deux agrégats SQL remplacent ce téléchargement complet.
router.get('/meta', async (req, res, next) => {
  try {
    const [totals, categories] = await Promise.all([
      Product.findOne({
        attributes: [
          [fn('COUNT', col('id')), 'count'],
          [fn('MIN', col('price')), 'minPrice'],
          [fn('MAX', col('price')), 'maxPrice']
        ],
        raw: true
      }),
      // DISTINCT ON retient une ligne par catégorie : son image sert de vignette
      // sur la page d'accueil, qui n'a donc plus à charger de produits pour cela.
      Product.sequelize.query(
        `SELECT c.category AS name, c.count, p.image_url AS image
           FROM (SELECT category, COUNT(id) AS count
                   FROM products
                  WHERE category IS NOT NULL AND category <> ''
                  GROUP BY category) c
           LEFT JOIN (SELECT DISTINCT ON (category) category, image_url
                        FROM products
                       WHERE category IS NOT NULL AND category <> ''
                         AND image_url IS NOT NULL AND image_url <> ''
                       ORDER BY category, created_at DESC) p
             ON p.category = c.category
          ORDER BY c.category ASC`,
        { type: Product.sequelize.QueryTypes.SELECT }
      )
    ]);

    res.json({
      count: Number(totals?.count || 0),
      minPrice: Number(totals?.minPrice || 0),
      maxPrice: Number(totals?.maxPrice || 0),
      categories: categories.map((row) => ({
        name: row.name,
        count: Number(row.count),
        image: row.image || null
      }))
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
