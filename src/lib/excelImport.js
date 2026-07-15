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

// Đọc TẤT CẢ sheet trong file (không chỉ sheet đầu) — file thật của công ty có nhiều sheet
// phụ (Dashboard, TheoDoi, DanhMuc, HĐTV_VP...) nên không thể giả định NhanVien luôn là sheet đầu.
export async function readAllSheets(file) {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  return wb.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null }),
  }))
}

// Giữ lại cho tương thích ngược — chỉ đọc sheet đầu tiên.
export async function readExcelRows(file) {
  const sheets = await readAllSheets(file)
  return sheets[0]?.rows || []
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

// Dò header tốt nhất trên TỪNG sheet, trả về sheet có số cột khớp nhiều nhất.
// Tránh trường hợp sheet cần tìm (VD "NhanVien") không phải sheet đầu tiên trong file
// (file thật thường có thêm Dashboard, TheoDoi, DanhMuc... ở trước).
export function detectBestSheet(sheets, synonyms, maxRowsToScan = 15) {
  let best = null
  for (const sheet of sheets) {
    const detected = detectHeaderRow(sheet.rows, synonyms, maxRowsToScan)
    if (!best || detected.count > best.count) {
      best = { ...detected, sheetName: sheet.name, rows: sheet.rows }
    }
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
