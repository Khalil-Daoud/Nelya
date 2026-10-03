// Analyseur CSV minimal (sans dépendance externe) adapté aux exports Excel :
// BOM UTF-8, séparateur ";" (Excel FR) ou ",", champs entre guillemets, sauts de ligne CRLF.

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const candidates = [';', ',', '\t'];
  let best = ';';
  let bestCount = -1;
  for (const candidate of candidates) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }
  return bestCount > 0 ? best : ';';
}

function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const delimiter = detectDelimiter(text);

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let hasContent = false;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    if (hasContent) rows.push(row);
    row = [];
    hasContent = false;
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      hasContent = true;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      hasContent = true;
    } else if (char === delimiter) {
      endField();
    } else if (char === '\n') {
      endRow();
    } else if (char !== '\r') {
      field += char;
      if (char.trim()) hasContent = true;
    }
  }
  endRow();

  return { rows, delimiter };
}

// "Désignation" -> "designation" : permet de reconnaître les en-têtes quels que
// soient les accents, la casse et les espaces utilisés dans le fichier Excel.
function normalizeHeader(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Accepte "25,500", "25.500", "1 250,00", "25,5 DT"
function parsePrice(value) {
  let text = String(value == null ? '' : value).trim();
  if (!text) return NaN;

  text = text.replace(/[\s\u00a0]/g, '').replace(/[^\d.,-]/g, '');
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    text = lastComma > lastDot
      ? text.replace(/\./g, '').replace(',', '.')
      : text.replace(/,/g, '');
  } else if (lastComma !== -1) {
    text = text.replace(',', '.');
  }

  return Number.parseFloat(text);
}

module.exports = { parseCsv, normalizeHeader, parsePrice };
