const XLSX = require('xlsx');
const { parseSpreadsheet } = require('../src/utils/spreadsheet');
const { parsePrice, normalizeHeader } = require('../src/utils/csv');

describe('parseSpreadsheet', () => {
  it('reads the first sheet as string rows with French headers', () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Ref', 'Catégorie', 'Désignation', 'Prix', 'Stock'],
      ['NEL-001', 'Soins Visage', 'Crème de Nuit', '89,900', 25],
      ['', '', '', '', '']
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Catalogue');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const rows = parseSpreadsheet(buffer);
    expect(rows).toHaveLength(2);
    expect(normalizeHeader(rows[0][2])).toBe('designation');
    expect(rows[1][0]).toBe('NEL-001');
    expect(parsePrice(rows[1][3])).toBeCloseTo(89.9, 3);
    expect(rows[1][4]).toBe('25');
  });
});
