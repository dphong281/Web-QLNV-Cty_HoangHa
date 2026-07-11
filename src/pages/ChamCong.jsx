import { useEffect, useState } from 'react'
import { reconcileDay, reconcileRange, importRawLogs, getTimekeepingSummary, deleteTimekeepingRecord } from '../lib/timekeepingQueries'
import { formatDate } from '../lib/format'
import { CHAM_CONG_RAW_SYNONYMS, CHAM_CONG_RAW_REQUIRED } from '../lib/importSynonyms'
import { cellValue, cellDateToIso, cellTimeToHm } from '../lib/excelImport'
import ExcelImportModal from '../components/ExcelImportModal'
import { Card, Button, Badge, Input, Select, LoadingState, ErrorState, EmptyState } from '../components/ui'

const TRANG_THAI_LABELS = {
  DungGio: 'Đúng giờ', DiMuon: 'Đi muộn', VeSom: 'Về sớm', OT: 'Làm thêm giờ', TuYBoCa: 'Tự ý bỏ ca',
}
const TRANG_THAI_COLORS = {
  DungGio: 'bg-[var(--color-good)]/10 text-[var(--color-good)]',
  DiMuon: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  VeSom: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  OT: 'bg-[var(--color-accent)]/12 text-[var(--color-accent-dark)]',
  TuYBoCa: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
}

function toDateStr(d) { return d.toISOString().slice(0, 10) }

export default function ChamCong() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateFrom, setDateFrom] = useState(toDateStr(new Date(new Date().setDate(1))))
  const [dateTo, setDateTo] = useState(toDateStr(new Date()))
  const [filterTrangThai, setFilterTrangThai] = useState('all')
  const [reconcileDate, setReconcileDate] = useState(toDateStr(new Date()))
  const [reconciling, setReconciling] = useState(false)
  const [rangeFrom, setRangeFrom] = useState(toDateStr(new Date(new Date().setDate(1))))
  const [rangeTo, setRangeTo] = useState(toDateStr(new Date()))
  const [reconcilingRange, setReconcilingRange] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => { load() }, [dateFrom, dateTo, filterTrangThai])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setList(await getTimekeepingSummary(dateFrom, dateTo, filterTrangThai === 'all' ? null : filterTrangThai))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleReconcile() {
    setReconciling(true)
    try {
      const count = await reconcileDay(new Date(reconcileDate))
      alert(`Đã đối soát ${count} bản ghi cho ngày ${formatDate(reconcileDate)}.`)
      load()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    } finally {
      setReconciling(false)
    }
  }

  async function handleReconcileRange() {
    setReconcilingRange(true)
    try {
      const count = await reconcileRange(rangeFrom, rangeTo)
      alert(`Đã đối soát ${count} bản ghi từ ${formatDate(rangeFrom)} đến ${formatDate(rangeTo)}.`)
      load()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    } finally {
      setReconcilingRange(false)
    }
  }

  function buildImportRow(row, colMap) {
    const maNv = String(cellValue(row, colMap, 'Mã NV')).trim().toUpperCase()
    if (!maNv) return null
    const logDate = cellDateToIso(row, colMap, 'Ngày')
    if (!logDate) return null
    return {
      maNv, logDate,
      checkIn: cellTimeToHm(row, colMap, 'Giờ vào'),
      checkOut: cellTimeToHm(row, colMap, 'Giờ ra'),
    }
  }

  async function handleDelete(id) {
    if (!confirm('Xoá bản ghi chấm công này?')) return
    try {
      await deleteTimekeepingRecord(id)
      load()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">Chấm công</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Đối soát công theo lịch ca đã xếp</p>
      </div>

      <Card className="p-5 mb-6">
        <h3 className="font-display font-semibold text-[var(--color-ink)] mb-3">Nhập log ra/vào ca từ Excel</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-3">Xuất từ máy chấm công vân tay/khuôn mặt — hệ thống tự nhận diện cột (Mã NV, Ngày, Giờ vào, Giờ ra) dù thứ tự cột trong file thế nào.</p>
        <Button variant="ghost" onClick={() => setImportOpen(true)}>📥 Nhập log từ Excel</Button>
      </Card>

      <Card className="p-5 mb-6">
        <h3 className="font-display font-semibold text-[var(--color-ink)] mb-3">Đối soát công</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-3">So sánh log ra/vào ca (đã nhập ở trên) với lịch ca đã xếp, tự tính đi muộn/về sớm/OT/tự ý bỏ ca.</p>
        <div className="flex items-end gap-3 flex-wrap">
          <Input label="Đối soát 1 ngày" type="date" value={reconcileDate} onChange={(e) => setReconcileDate(e.target.value)} className="max-w-[180px]" />
          <Button variant="ghost" onClick={handleReconcile} disabled={reconciling}>{reconciling ? 'Đang đối soát...' : 'Đối soát ngày này'}</Button>
          <div className="w-px h-8 bg-[var(--color-line)] mx-1" />
          <Input label="Từ ngày" type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className="max-w-[160px]" />
          <Input label="Đến ngày" type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className="max-w-[160px]" />
          <Button variant="accent" onClick={handleReconcileRange} disabled={reconcilingRange}>{reconcilingRange ? 'Đang đối soát...' : 'Đối soát cả khoảng'}</Button>
        </div>
      </Card>

      <div className="flex gap-3 mb-4">
        <Input label="Từ ngày" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="max-w-[160px]" />
        <Input label="Đến ngày" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="max-w-[160px]" />
        <Select label="Trạng thái" value={filterTrangThai} onChange={(e) => setFilterTrangThai(e.target.value)} className="max-w-[180px]">
          <option value="all">Tất cả</option>
          {Object.entries(TRANG_THAI_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      <Card>
        {loading ? <LoadingState /> : error ? <div className="p-4"><ErrorState message={error} /></div> : list.length === 0 ? (
          <EmptyState title="Không có bản ghi chấm công trong khoảng thời gian này" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide border-b border-[var(--color-line)]">
                <th className="px-5 py-3 font-medium">Ngày</th>
                <th className="px-5 py-3 font-medium">Nhân viên</th>
                <th className="px-5 py-3 font-medium">Nơi làm việc</th>
                <th className="px-5 py-3 font-medium">Giờ vào</th>
                <th className="px-5 py-3 font-medium">Giờ ra</th>
                <th className="px-5 py-3 font-medium">Trạng thái</th>
                <th className="px-5 py-3 font-medium text-right">OT (giờ)</th>
                <th className="px-5 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-[var(--color-line)] last:border-0 hover:bg-black/[0.015]">
                  <td className="px-5 py-3">{formatDate(r.ngay)}</td>
                  <td className="px-5 py-3 font-medium text-[var(--color-ink)]">{r.hoTen} <span className="text-xs text-[var(--color-text-muted)]">({r.maNv})</span></td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)]">{r.noiLamViec}</td>
                  <td className="px-5 py-3">{r.gioVao || '—'}</td>
                  <td className="px-5 py-3">{r.gioRa || '—'}</td>
                  <td className="px-5 py-3"><Badge className={TRANG_THAI_COLORS[r.trangThai]}>{TRANG_THAI_LABELS[r.trangThai] || r.trangThai}</Badge></td>
                  <td className="px-5 py-3 text-right">{r.otGio || 0}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => handleDelete(r.id)} className="text-[var(--color-danger)] hover:underline text-sm font-medium">Xoá</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Nhập log chấm công từ Excel"
        synonyms={CHAM_CONG_RAW_SYNONYMS}
        requiredKeys={CHAM_CONG_RAW_REQUIRED}
        buildRow={buildImportRow}
        onImport={async (rows) => {
          const count = await importRawLogs(rows, 'excel-import')
          return { count }
        }}
        resultLabel={(r) => `Đã nhập ${r.count} dòng log. Vào phần "Đối soát công" ở trên để tính kết quả.`}
      />
    </div>
  )
}
