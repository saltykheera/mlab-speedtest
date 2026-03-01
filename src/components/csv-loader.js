/**
 * Lightweight CSV → JSON parser.
 * Handles quoted fields and infers numeric types automatically.
 */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = splitLine(lines[0]);

  return lines.slice(1).map(line => {
    const vals = splitLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      const v = vals[i] !== undefined ? vals[i] : '';
      obj[h.trim()] = isNaN(v) || v === '' ? v : Number(v);
    });
    return obj;
  });
}

function splitLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}
