const DEFAULT_TIERS = [
  { min: 0, max: 20, points: 10 },
  { min: 20, max: 50, points: 20 },
  { min: 50, max: 1000, points: 50 }
];

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Normalise et valide les paliers. Bornes inférieures incluses, on retient
 * le premier palier qui contient le prix (triés par min croissant).
 */
function normalizeTiers(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('Indiquez au moins un palier (prix min, prix max, points).');
  }
  if (raw.length > 20) {
    throw new Error('20 paliers au maximum.');
  }

  const tiers = raw.map((row, index) => {
    const min = toNumber(row.min);
    const max = toNumber(row.max);
    const points = toNumber(row.points);
    if (!Number.isFinite(min) || min < 0) {
      throw new Error(`Palier ${index + 1} : le prix minimum doit être un nombre ≥ 0.`);
    }
    if (!Number.isFinite(max) || max <= min) {
      throw new Error(`Palier ${index + 1} : le prix maximum doit être supérieur au minimum.`);
    }
    if (!Number.isInteger(points) || points < 0 || points > 10000) {
      throw new Error(`Palier ${index + 1} : les points doivent être un entier entre 0 et 10 000.`);
    }
    return { min, max, points };
  });

  tiers.sort((a, b) => a.min - b.min || a.max - b.max);
  return tiers;
}

function pointsForPrice(price, tiers) {
  const value = Number(price);
  if (!Number.isFinite(value) || value < 0) return 0;
  const list = Array.isArray(tiers) && tiers.length ? tiers : DEFAULT_TIERS;
  const match = list.find((tier) => value >= tier.min && value <= tier.max);
  return match ? match.points : 0;
}

function pointsForItems(items, tiers) {
  return (items || []).reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    return sum + pointsForPrice(item.unit_price, tiers) * qty;
  }, 0);
}

module.exports = {
  DEFAULT_TIERS,
  normalizeTiers,
  pointsForPrice,
  pointsForItems
};
