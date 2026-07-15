import { useRef, useState } from 'react'
import { readAllSheets, detectBestSheet } from '../lib/excelImport'
import { Button, Modal, ErrorState } from './ui'

export default function ExcelImportModal({
  open, onClose, title, synonyms, requiredKeys, buildRow, onImport, resultLabel,
}) {
  const fileInputRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [detected, setDetected] = useState(null)
  const [error, setError] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  function reset() {
    setFileName('')
    setDetected(null)
    setError(null)
    setResult(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function openFilePicker() {
    setError(null)
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setFileName(file.name)
    setResult(null)
    try {
      const sheets = await readAllSheets(file)
      const best = detectBestSheet(sheets, synonyms)
      const { sheetName, rowIndex, count, colMap, rows: rawRows } = best

      if (count === 0) {
        setError(`Đã dò qua ${sheets.length} sheet trong file (mỗi sheet dò 15 dòng đầu) nhưng không nhận diện được cột nào khớp với hệ thống. Kiểm tra lại tên cột trong file Excel.`)
        setDetected(null)
        return
      }
      const missing = requiredKeys.filter((k) => !(k in colMap))
      if (missing.length) {
        setError(`Đã tự nhận diện sheet "${sheetName}", dòng tiêu đề là dòng số ${rowIndex + 1}, nhưng thiếu cột bắt buộc: ${missing.join(', ')}.`)
        setDetected(null)
        return
      }

      const dataRows = rawRows.slice(rowIndex + 1).filter((r) => r && r.length)
      const mappedRows = dataRows.map((r) => buildRow(r, colMap)).filter(Boolean)

      setDetected({ sheetName, rowIndex, count, colMap, mappedRows })
    } catch (err) {
      setError('Lỗi đọc file Excel: ' + err.message)
    }
  }

  async function handleConfirmImport() {
    setImporting(true)
    setError(null)
    try {
      const res = await onImport(detected.mappedRows)
      setResult(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  const allHeaders = Object.keys(synonyms)
  const notFoundHeaders = detected ? allHeaders.filter((h) => !(h in detected.colMap)) : []

  return (
    <Modal open={open} onClose={handleClose} title={title} wide>
      <div className="space-y-4">
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelected} />

        {!result && (
          <Button variant="ghost" onClick={openFilePicker}>📁 Chọn file Excel (.xlsx, .xls)</Button>
        )}
        {fileName && !result && <p className="text-sm text-[var(--color-text-muted)]">File: {fileName}</p>}

        {error && <ErrorState message={error} />}

        {detected && !result && (
          <div className="space-y-3">
            <div className="rounded-lg bg-[var(--color-good)]/8 border border-[var(--color-good)]/20 text-sm px-3 py-2 text-[var(--color-good)]">
              Đã tự nhận diện sheet "{detected.sheetName}", dòng tiêu đề là dòng số {detected.rowIndex + 1} — nhận diện được {detected.count}/{allHeaders.length} cột, tìm thấy {detected.mappedRows.length} dòng dữ liệu hợp lệ.
            </div>
            {notFoundHeaders.length > 0 && (
              <div className="rounded-lg bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/25 text-sm px-3 py-2 text-[var(--color-warning)]">
                Không tìm thấy các cột sau trong file (sẽ để trống): {notFoundHeaders.join(', ')}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={reset}>Chọn file khác</Button>
              <Button variant="accent" onClick={handleConfirmImport} disabled={importing || detected.mappedRows.length === 0}>
                {importing ? 'Đang nhập...' : `Nhập ${detected.mappedRows.length} dòng`}
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="rounded-lg bg-[var(--color-good)]/8 border border-[var(--color-good)]/20 text-sm px-3 py-2 text-[var(--color-good)]">
              {resultLabel ? resultLabel(result) : `Đã xử lý xong: ${JSON.stringify(result)}`}
            </div>
            {result.errors?.length > 0 && (
              <div className="rounded-lg bg-[var(--color-danger)]/8 border border-[var(--color-danger)]/20 text-sm px-3 py-2 text-[var(--color-danger)] max-h-40 overflow-y-auto">
                {result.errors.map(([code, msg], i) => <div key={i}>{code}: {msg}</div>)}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={reset}>Nhập file khác</Button>
              <Button variant="accent" onClick={handleClose}>Xong</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
