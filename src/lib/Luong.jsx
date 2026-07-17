import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getOrCreatePeriod, closePeriod, generatePayroll, getPayrollTable, getHoSoLuong, upsertHoSoLuong, getActiveEmployeesWithRate,
  tinhTongPhuCap, tinhTongThuNhap,
} from '../lib/payrollQueries'
import { KHOI_LABELS, formatCurrency } from '../lib/format'
import { exportToExcel } from '../lib/excelImport'
import { Card, Button, Badge, Input, Select, Modal, LoadingState, ErrorState, EmptyState } from '../components/ui'

const ALLOWANCE_GROUPS = [
  {
    title: 'Lương & phụ cấp có đóng BHXH',
    fields: [
      ['luong_co_ban', 'Lương chức danh (Lương CB, đóng BHXH)'],
      ['phu_cap_chuc_danh', 'Phụ cấp chức danh/chức vụ'],
      ['phu_cap_trach_nhiem_luong', 'Phụ cấp trách nhiệm'],
      ['phu_cap_doc_hai_luong', 'Phụ cấp độc hại, nguy hiểm'],
      ['phu_cap_tham_nien', 'Phụ cấp thâm niên'],
      ['phu_cap_thu_hut', 'Phụ cấp thu hút'],
      ['phu_cap_vung', 'Phụ cấp vùng'],
      ['phu_cap_kiem_nhiem', 'Phụ cấp kiêm nhiệm'],
      ['luong_kpi', 'Lương KPI (hiệu quả công việc)'],
    ],
  },
  {
    title: 'Phụ cấp không đóng BHXH',
    fields: [
      ['phu_cap_xang_xe', 'Phụ cấp xăng xe'],
      ['phu_cap_dien_thoai', 'Phụ cấp điện thoại'],
      ['phu_cap_nha_o', 'Phụ cấp nhà ở'],
      ['phu_cap_an_ca', 'Phụ cấp ăn ca'],
      ['phu_cap_dong_phuc', 'Phụ cấp đồng phục'],
    ],
  },
  {
    title: 'Phúc lợi',
    fields: [['phuc_loi_con_nho', 'Phúc lợi con nhỏ dưới 6 tuổi']],
  },
  {
    title: 'Đơn giá tính lương theo phát sinh (giữ nguyên, không đổi)',
    fields: [
      ['don_gia_ca_dem', 'Đơn giá / ca đêm'],
      ['don_gia_ot_gio', 'Đơn giá / giờ OT'],
      ['don_gia_chuyen', 'Đơn giá / chuyến hàng'],
      ['muc_phat_vang_mat', 'Mức phạt / lần vắng mặt'],
    ],
  },
]
const ALL_HS_KEYS = ALLOWANCE_GROUPS.flatMap((g) => g.fields.map(([k]) => k))

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
  const [showDetail, setShowDetail] = useState(false)

  const DETAIL_COLUMNS = [
    ['phu_cap_chuc_danh', 'PC chức danh'], ['phu_cap_trach_nhiem_luong', 'PC trách nhiệm'],
    ['phu_cap_doc_hai_luong', 'PC độc hại'], ['phu_cap_tham_nien', 'PC thâm niên'],
    ['phu_cap_thu_hut', 'PC thu hút'], ['phu_cap_vung', 'PC vùng'], ['phu_cap_kiem_nhiem', 'PC kiêm nhiệm'],
    ['luong_kpi', 'Lương KPI'], ['phu_cap_xang_xe', 'PC xăng xe'], ['phu_cap_dien_thoai', 'PC điện thoại'],
    ['phu_cap_nha_o', 'PC nhà ở'], ['phu_cap_an_ca', 'PC ăn ca'], ['phu_cap_dong_phuc', 'PC đồng phục'],
    ['phuc_loi_con_nho', 'Phúc lợi con nhỏ'],
  ]

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
        // Chưa tính lương kỳ này — hiện "xem trước" danh sách NV đang làm việc, kèm Lương
        // cơ bản/Phụ cấp đã có sẵn ở Đơn giá lương (nếu đã khai báo); các cột phát sinh theo
        // kỳ (ca đêm/OT/chuyến/khấu trừ/thực lãnh) để trống vì chưa tính cho kỳ này.
        const employees = await getActiveEmployeesWithRate()
        setRows(employees.map((e) => ({
          payrollId: null, maNv: e['Mã NV'], hoTen: e['Họ tên'], khoi: e['Khối'],
          luongCoBan: e.luongCoBan, phuCap: e.phuCap, luongCaDem: null, luongOt: null,
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
      const form = { maNv }
      for (const key of ALL_HS_KEYS) form[key] = String(hs?.[key] || 0)
      setHsForm(form)
      setHsModalOpen(true)
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
  }

  async function handleSaveHoSo(e) {
    e.preventDefault()
    setSavingHs(true)
    try {
      const payload = {}
      for (const key of ALL_HS_KEYS) payload[key] = Number(hsForm[key]) || 0
      await upsertHoSoLuong(hsForm.maNv, payload)
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
    const headers = ['Mã NV', 'Họ tên', 'Khối', 'Lương CB', 'Phụ cấp', ...(showDetail ? DETAIL_COLUMNS.map(([, label]) => label) : []), 'Ca đêm', 'OT', 'Chuyến', 'Khấu trừ', 'Thực lãnh']
    const dataRows = rows.map((r) => [
      r.maNv, r.hoTen, KHOI_LABELS[r.khoi] || r.khoi, r.luongCoBan || 0, r.phuCap || 0,
      ...(showDetail ? DETAIL_COLUMNS.map(([key]) => r[key] || 0) : []),
      r.luongCaDem || 0, r.luongOt || 0, r.luongChuyen || 0, r.khauTru || 0, r.thucLanh || 0,
    ])
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
          {rows.length > 0 && !isPreview && <Button variant="ghost" onClick={() => setShowDetail((v) => !v)}>{showDetail ? '📐 Thu gọn' : '📊 Xem chi tiết'}</Button>}
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

      <Card className={showDetail ? 'overflow-x-auto' : ''}>
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
                {showDetail && DETAIL_COLUMNS.map(([key, label]) => (
                  <th key={key} className="px-4 py-3 font-medium text-right whitespace-nowrap">{label}</th>
                ))}
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
                  <td className="px-4 py-2.5">
                    <button onClick={() => openHoSoLuong(r.maNv)} className="hover:underline text-left">{r.hoTen}</button>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{KHOI_LABELS[r.khoi] || r.khoi}</td>
                  <td className="px-4 py-2.5 text-right">{money(r.luongCoBan)}</td>
                  <td className="px-4 py-2.5 text-right">{money(r.phuCap)}</td>
                  {showDetail && DETAIL_COLUMNS.map(([key]) => (
                    <td key={key} className="px-4 py-2.5 text-right text-[var(--color-text-muted)]">{money(r[key])}</td>
                  ))}
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

      <Modal open={hsModalOpen} onClose={() => setHsModalOpen(false)} title={`Đơn giá lương — ${hsForm?.maNv}`} size="xl">
        {hsForm && (
          <form onSubmit={handleSaveHoSo} className="space-y-6">
            {ALLOWANCE_GROUPS.map((group) => (
              <div key={group.title}>
                <h4 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-2">{group.title}</h4>
                <div className="grid grid-cols-2 gap-4">
                  {group.fields.map(([key, label]) => (
                    <Input
                      key={key}
                      label={label}
                      type="number"
                      value={hsForm[key] ?? '0'}
                      onChange={(e) => setHsForm({ ...hsForm, [key]: e.target.value })}
                    />
                  ))}
                </div>
              </div>
            ))}

            <Card className="p-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-[var(--color-text-muted)] uppercase">Tổng phụ cấp</div>
                <div className="font-display text-lg font-semibold text-[var(--color-ink)]">{formatCurrency(tinhTongPhuCap(hsForm))}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-muted)] uppercase">Tổng thu nhập (chưa gồm ca đêm/OT/chuyến)</div>
                <div className="font-display text-lg font-semibold text-[var(--color-accent-dark)]">{formatCurrency(tinhTongThuNhap(hsForm))}</div>
              </div>
            </Card>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-line)]">
              <Button type="button" variant="ghost" onClick={() => setHsModalOpen(false)}>Huỷ</Button>
              <Button type="submit" variant="accent" disabled={savingHs}>{savingHs ? 'Đang lưu...' : 'Lưu'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
