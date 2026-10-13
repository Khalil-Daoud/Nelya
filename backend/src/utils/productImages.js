const MAX_IMAGES = 8;

function pushUrl(list, value) {
  const url = String(value || '').trim();
  if (url && !list.includes(url)) list.push(url);
}

function parseImagesField(images) {
  if (Array.isArray(images)) return images;
  if (images && typeof images === 'object') return Object.values(images);
  if (typeof images !== 'string') return [];
  const text = images.trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [text];
  } catch {
    return text.split(/[,;|]/);
  }
}

function normalizeProductImages({ image_url, images } = {}) {
  const list = [];
  parseImagesField(images).forEach((item) => pushUrl(list, item));
  pushUrl(list, image_url);
  const capped = list.slice(0, MAX_IMAGES);
  return {
    images: capped,
    image_url: capped[0] || ''
  };
}

module.exports = { MAX_IMAGES, normalizeProductImages };
