import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getOrCreatePeriod, closePeriod, generatePayroll, getPayrollTable, getHoSoLuong, upsertHoSoLuong, getActiveEmployeesBasic,
} from '../lib/payrollQueries'
import { KHOI_LABELS, formatCurrency } from '../lib/format'
import { exportToExcel } from '../lib/excelImport'
import { Card, Button, Badge, Input, Select, Modal, LoadingState, ErrorState, EmptyState } from '../components/ui'

const now = new Date()

export default function Luong() {
  const { user } = useAuth()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [period, setPeriod] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [closing, setClosing] = useState(false)

  const [hsModalOpen, setHsModalOpen] = useState(false)
  const [hsForm, setHsForm] = useState(null)
  const [savingHs, setSavingHs] = useState(false)
  const [isPreview, setIsPreview] = useState(false)

  useEffect(() => { load() }, [month, year])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const p = await getOrCreatePeriod(month, year)
      setPeriod(p)
      const payrollRows = await getPayrollTable(p.id)
      if (payrollRows.length > 0) {
        setRows(payrollRows)
        setIsPreview(false)
      } else {
        // Chưa tính lương kỳ này — hiện "xem trước" danh sách NV đang làm việc,
        // các cột tiền để trống thay vì màn hình trống trơn khó hiểu.
        const employees = await getActiveEmployeesBasic()
        setRows(employees.map((e) => ({
          payrollId: null, maNv: e['Mã NV'], hoTen: e['Họ tên'], khoi: e['Khối'],
          luongCoBan: null, phuCap: null, luongCaDem: null, luongOt: null,
          luongChuyen: null, khauTru: null, thucLanh: null,
        })))
        setIsPreview(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const { count } = await generatePayroll(month, year)
      alert(`Đã tính lương cho ${count} nhân viên.`)
      load()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleClose() {
    if (!confirm('Chốt kỳ lương này? Sau khi chốt sẽ không tính lại được nữa.')) return
    setClosing(true)
    try {
      await closePeriod(period.id, user.id)
      load()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    } finally {
      setClosing(false)
    }
  }

  async function openHoSoLuong(maNv) {
    try {
      const hs = await getHoSoLuong(maNv)
      setHsForm({
        maNv,
        luong_co_ban: String(hs?.luong_co_ban || 0),
        phu_cap_co_dinh: String(hs?.phu_cap_co_dinh || 0),
        don_gia_ca_dem: String(hs?.don_gia_ca_dem || 0),
        don_gia_ot_gio: String(hs?.don_gia_ot_gio || 0),
        don_gia_chuyen: String(hs?.don_gia_chuyen || 0),
        muc_phat_vang_mat: String(hs?.muc_phat_vang_mat || 0),
      })
      setHsModalOpen(true)
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
  }

  async function handleSaveHoSo(e) {
    e.preventDefault()
    setSavingHs(true)
    try {
      await upsertHoSoLuong(hsForm.maNv, {
        luong_co_ban: Number(hsForm.luong_co_ban) || 0,
        phu_cap_co_dinh: Number(hsForm.phu_cap_co_dinh) || 0,
        don_gia_ca_dem: Number(hsForm.don_gia_ca_dem) || 0,
        don_gia_ot_gio: Number(hsForm.don_gia_ot_gio) || 0,
        don_gia_chuyen: Number(hsForm.don_gia_chuyen) || 0,
        muc_phat_vang_mat: Number(hsForm.muc_phat_vang_mat) || 0,
      })
      setHsModalOpen(false)
    } catch (err) {
      alert('Lỗi: ' + err.message)
    } finally {
      setSavingHs(false)
    }
  }

  const tongThucLanh = isPreview ? 0 : rows.reduce((s, r) => s + r.thucLanh, 0)
  const money = (v) => (v === null || v === undefined ? '—' : formatCurrency(v))

  function handleExport() {
    const headers = ['Mã NV', 'Họ tên', 'Khối', 'Lương CB', 'Phụ cấp', 'Ca đêm', 'OT', 'Chuyến', 'Khấu trừ', 'Thực lãnh']
    const dataRows = rows.map((r) => [r.maNv, r.hoTen, KHOI_LABELS[r.khoi] || r.khoi, r.luongCoBan || 0, r.phuCap || 0, r.luongCaDem || 0, r.luongOt || 0, r.luongChuyen || 0, r.khauTru || 0, r.thucLanh || 0])
    exportToExcel(headers, dataRows, `BangLuong_${month}_${year}.xlsx`, `BangLuong_${month}_${year}`)
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">Lương</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Kỳ lương tháng {month}/{year} {period && <Badge className={period.trang_thai === 'DaChot' ? 'bg-black/5 text-[var(--color-text-muted)] ml-2' : 'bg-[var(--color-good)]/10 text-[var(--color-good)] ml-2'}>{period.trang_thai === 'DaChot' ? 'Đã chốt' : 'Đang mở'}</Badge>}
          </p>
        </div>
        <div className="flex gap-2">
          {rows.length > 0 && <Button variant="ghost" onClick={handleExport}>⬇ Xuất Excel</Button>}
          {period?.trang_thai !== 'DaChot' && (
            <>
              <Button variant="ghost" onClick={handleGenerate} disabled={generating}>{generating ? 'Đang tính...' : '🧮 Tính lương'}</Button>
              {!isPreview && rows.length > 0 && <Button variant="accent" onClick={handleClose} disabled={closing}>{closing ? 'Đang chốt...' : 'Chốt kỳ lương'}</Button>}
            </>
          )}
        </div>
      </div>

      <div className="flex items-end gap-3 mb-4">
        <Select label="Tháng" value={month} onChange={(e) => setMonth(Number(e.target.value))} className="max-w-[100px]">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}</option>)}
        </Select>
        <Select label="Năm" value={year} onChange={(e) => setYear(Number(e.target.value))} className="max-w-[120px]">
          {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </Select>
        <div className="text-sm text-[var(--color-text-muted)]">
          Bấm vào mã NV trong bảng để chỉnh đơn giá lương (lương cơ bản/phụ cấp lấy tự động từ hợp đồng, các đơn giá còn lại cần khai báo tay).
        </div>
      </div>

      {isPreview && rows.length > 0 && (
        <div className="mb-4 rounded-lg bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/25 text-sm px-3 py-2 text-[var(--color-warning)]">
          Kỳ lương này chưa được tính — đang hiện trước danh sách nhân viên đang làm việc, các cột tiền để trống. Bấm "Tính lương" để tính thật.
        </div>
      )}

      {rows.length > 0 && !isPreview && (
        <Card className="p-5 mb-4">
          <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Tổng thực lãnh kỳ này</div>
          <div className="font-display text-2xl font-semibold text-[var(--color-ink)] mt-1">{formatCurrency(tongThucLanh)}</div>
        </Card>
      )}

      <Card>
        {loading ? <LoadingState /> : error ? <div className="p-4"><ErrorState message={error} /></div> : rows.length === 0 ? (
          <EmptyState title="Chưa tính lương cho kỳ này" sub="Bấm 'Tính lương' để hệ thống tự tính dựa trên hợp đồng, ca đêm, OT, chuyến hàng, vắng mặt." action={<Button variant="accent" onClick={handleGenerate}>🧮 Tính lương</Button>} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide border-b border-[var(--color-line)]">
                <th className="px-4 py-3 font-medium">Mã NV</th>
                <th className="px-4 py-3 font-medium">Họ tên</th>
                <th className="px-4 py-3 font-medium">Khối</th>
                <th className="px-4 py-3 font-medium text-right">Lương CB</th>
                <th className="px-4 py-3 font-medium text-right">Phụ cấp</th>
                <th className="px-4 py-3 font-medium text-right">Ca đêm</th>
                <th className="px-4 py-3 font-medium text-right">OT</th>
                <th className="px-4 py-3 font-medium text-right">Chuyến</th>
                <th className="px-4 py-3 font-medium text-right">Khấu trừ</th>
                <th className="px-4 py-3 font-medium text-right">Thực lãnh</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.payrollId} className="border-b border-[var(--color-line)] last:border-0 hover:bg-black/[0.015]">
                  <td className="px-4 py-2.5 font-medium text-[var(--color-ink)]">
                    <button onClick={() => openHoSoLuong(r.maNv)} className="hover:underline">{r.maNv}</button>
                  </td>
                  <td className="px-4 py-2.5">{r.hoTen}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{KHOI_LABELS[r.khoi] || r.khoi}</td>
                  <td className="px-4 py-2.5 text-right">{money(r.luongCoBan)}</td>
                  <td className="px-4 py-2.5 text-right">{money(r.phuCap)}</td>
                  <td className="px-4 py-2.5 text-right">{money(r.luongCaDem)}</td>
                  <td className="px-4 py-2.5 text-right">{money(r.luongOt)}</td>
                  <td className="px-4 py-2.5 text-right">{money(r.luongChuyen)}</td>
                  <td className="px-4 py-2.5 text-right text-[var(--color-danger)]">{r.khauTru ? '-' + money(r.khauTru) : '—'}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[var(--color-ink)]">{money(r.thucLanh)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={hsModalOpen} onClose={() => setHsModalOpen(false)} title={`Đơn giá lương — ${hsForm?.maNv}`}>
        {hsForm && (
          <form onSubmit={handleSaveHoSo} className="space-y-4">
            <Input label="Lương cơ bản (tự động từ hợp đồng, có thể sửa tay)" type="number" value={hsForm.luong_co_ban} onChange={(e) => setHsForm({ ...hsForm, luong_co_ban: e.target.value })} />
            <Input label="Phụ cấp cố định" type="number" value={hsForm.phu_cap_co_dinh} onChange={(e) => setHsForm({ ...hsForm, phu_cap_co_dinh: e.target.value })} />
            <Input label="Đơn giá / ca đêm" type="number" value={hsForm.don_gia_ca_dem} onChange={(e) => setHsForm({ ...hsForm, don_gia_ca_dem: e.target.value })} />
            <Input label="Đơn giá / giờ OT" type="number" value={hsForm.don_gia_ot_gio} onChange={(e) => setHsForm({ ...hsForm, don_gia_ot_gio: e.target.value })} />
            <Input label="Đơn giá / chuyến hàng" type="number" value={hsForm.don_gia_chuyen} onChange={(e) => setHsForm({ ...hsForm, don_gia_chuyen: e.target.value })} />
            <Input label="Mức phạt / lần vắng mặt" type="number" value={hsForm.muc_phat_vang_mat} onChange={(e) => setHsForm({ ...hsForm, muc_phat_vang_mat: e.target.value })} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setHsModalOpen(false)}>Huỷ</Button>
              <Button type="submit" variant="accent" disabled={savingHs}>{savingHs ? 'Đang lưu...' : 'Lưu'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
