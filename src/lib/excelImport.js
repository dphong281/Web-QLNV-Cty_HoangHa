import * as XLSX from 'xlsx'

export function normalizeHeader(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

export async function readExcelRows(file) {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null })
}

export function detectHeaderRow(rows, synonyms, maxRowsToScan = 15) {
  const normSynonyms = {}
  for (const [key, syns] of Object.entries(synonyms)) {
    normSynonyms[key] = new Set([normalizeHeader(key), ...syns.map(normalizeHeader)])
  }

  let best = { count: 0, rowIndex: -1, colMap: {} }
  const limit = Math.min(maxRowsToScan, rows.length)
  for (let r = 0; r < limit; r++) {
    const row = rows[r] || []
    const colMap = {}
    for (let c = 0; c < row.length; c++) {
      const cell = row[c]
      if (cell === null || cell === undefined || cell === '') continue
      const norm = normalizeHeader(cell)
      for (const [key, set] of Object.entries(normSynonyms)) {
        if (colMap[key] !== undefined) continue
        if (set.has(norm)) { colMap[key] = c; break }
      }
    }
    const count = Object.keys(colMap).length
    if (count > best.count) best = { count, rowIndex: r, colMap }
  }
  return best
}

export function cellValue(row, colMap, standardKey, fallback = '') {
  const idx = colMap[standardKey]
  if (idx === undefined || idx >= row.length) return fallback
  const v = row[idx]
  if (v === null || v === undefined) return fallback
  return typeof v === 'string' ? v.trim() : v
}

export function cellDateToIso(row, colMap, standardKey) {
  const raw = cellValue(row, colMap, standardKey, null)
  if (!raw) return ''
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10)
  }
  const text = String(raw).trim()
  const m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const [, d, mo, y] = m
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  return ''
}

export function cellTimeToHm(row, colMap, standardKey) {
  const raw = cellValue(row, colMap, standardKey, null)
  if (!raw) return null
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return `${String(raw.getHours()).padStart(2, '0')}:${String(raw.getMinutes()).padStart(2, '0')}`
  }
  const text = String(raw).trim()
  const m = text.match(/^(\d{1,2}):(\d{2})/)
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`
  return null
}

export function exportToExcel(headers, rows, filename, sheetName = 'Sheet1') {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename)
}
