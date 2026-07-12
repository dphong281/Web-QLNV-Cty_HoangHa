import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getAllDonVi, createDonVi, getAllLoaiCa, createLoaiCa } from '../lib/shiftQueries'
import { getAllSettings, setValue, exportAllDataForBackup } from '../lib/settingsQueries'
import { Card, Button, Badge, Input, Select, Modal, LoadingState, EmptyState, ErrorState } from '../components/ui'

export default function CaiDat() {
  const { isAdmin } = useAuth()
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">Cài đặt</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Đơn vị, loại ca, ngưỡng hệ thống</p>
      </div>
      {!isAdmin && (
        <Card className="p-5 mb-6 text-sm text-[var(--color-text-muted)]">
          Chỉ Admin mới sửa được cài đặt hệ thống — bạn có thể xem nhưng không sửa được.
        </Card>
      )}
      <div className="space-y-6">
        <DonViSection readOnly={!isAdmin} />
        <LoaiCaSection readOnly={!isAdmin} />
        <NguongSection readOnly={!isAdmin} />
        {isAdmin && <LichBackupSection />}
        {isAdmin && <SaoLuuThuCongSection />}
      </div>
    </div>
  )
}

const LOAI_DON_VI_LABELS = { CayXang: 'Cửa hàng xăng', Kho: 'Kho', VanPhong: 'Văn phòng' }

function DonViSection({ readOnly }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ ten_don_vi: '', loai_don_vi: 'CayXang', dia_chi: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    try { setList(await getAllDonVi()) } finally { setLoading(false) }
  }
  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await createDonVi({ ...form, is_active: true })
      setModalOpen(false)
      setForm({ ten_don_vi: '', loai_don_vi: 'CayXang', dia_chi: '' })
      load()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-line)]">
        <h3 className="font-display font-semibold text-[var(--color-ink)]">Đơn vị (cây xăng / kho / văn phòng)</h3>
        {!readOnly && <Button variant="ghost" onClick={() => setModalOpen(true)} className="!py-1.5 !px-3 text-xs">+ Thêm đơn vị</Button>}
      </div>
      {loading ? <LoadingState /> : list.length === 0 ? <EmptyState title="Chưa có đơn vị nào" /> : (
        <ul className="divide-y divide-[var(--color-line)]">
          {list.map((d) => (
            <li key={d.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <span className="font-medium text-sm text-[var(--color-ink)]">{d.ten_don_vi}</span>
                <span className="text-xs text-[var(--color-text-muted)] ml-2">{d.dia_chi}</span>
              </div>
              <Badge className="bg-black/5 text-[var(--color-text-muted)]">{LOAI_DON_VI_LABELS[d.loai_don_vi] || d.loai_don_vi}</Badge>
            </li>
          ))}
        </ul>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Thêm đơn vị">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Tên đơn vị *" required value={form.ten_don_vi} onChange={(e) => setForm({ ...form, ten_don_vi: e.target.value })} />
          <Select label="Loại đơn vị" value={form.loai_don_vi} onChange={(e) => setForm({ ...form, loai_don_vi: e.target.value })}>
            {Object.entries(LOAI_DON_VI_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Input label="Địa chỉ" value={form.dia_chi} onChange={(e) => setForm({ ...form, dia_chi: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Huỷ</Button>
            <Button type="submit" variant="accent" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
          </div>
        </form>
      </Modal>
    </Card>
  )
}

function LoaiCaSection({ readOnly }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ ten_ca: '', gio_bat_dau: '06:00', gio_ket_thuc: '14:00', is_night: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    try { setList(await getAllLoaiCa()) } finally { setLoading(false) }
  }
  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await createLoaiCa(form)
      setModalOpen(false)
      setForm({ ten_ca: '', gio_bat_dau: '06:00', gio_ket_thuc: '14:00', is_night: false })
      load()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-line)]">
        <h3 className="font-display font-semibold text-[var(--color-ink)]">Loại ca</h3>
        {!readOnly && <Button variant="ghost" onClick={() => setModalOpen(true)} className="!py-1.5 !px-3 text-xs">+ Thêm loại ca</Button>}
      </div>
      {loading ? <LoadingState /> : list.length === 0 ? (
        <EmptyState title="Chưa có loại ca nào" sub="Cần ít nhất 3 loại ca (Ca 1, Ca 2, Ca 3) để dùng tính năng xếp ca tự động." />
      ) : (
        <ul className="divide-y divide-[var(--color-line)]">
          {list.map((c) => (
            <li key={c.id} className="px-5 py-3 flex items-center justify-between">
              <span className="font-medium text-sm text-[var(--color-ink)]">{c.ten_ca}</span>
              <span className="text-xs text-[var(--color-text-muted)]">{c.gio_bat_dau} → {c.gio_ket_thuc} {c.is_night && '🌙 Ca đêm'}</span>
            </li>
          ))}
        </ul>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Thêm loại ca">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Tên ca *" required value={form.ten_ca} onChange={(e) => setForm({ ...form, ten_ca: e.target.value })} placeholder="VD: Ca 1" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Giờ bắt đầu" type="time" value={form.gio_bat_dau} onChange={(e) => setForm({ ...form, gio_bat_dau: e.target.value })} />
            <Input label="Giờ kết thúc" type="time" value={form.gio_ket_thuc} onChange={(e) => setForm({ ...form, gio_ket_thuc: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_night} onChange={(e) => setForm({ ...form, is_night: e.target.checked })} />
            Đây là ca đêm (dùng tính lương ca đêm)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Huỷ</Button>
            <Button type="submit" variant="accent" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
          </div>
        </form>
      </Modal>
    </Card>
  )
}

function NguongSection({ readOnly }) {
  const [lateThreshold, setLateThreshold] = useState('15')
  const [earlyThreshold, setEarlyThreshold] = useState('15')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const all = await getAllSettings()
        const map = Object.fromEntries(all.map((s) => [s.khoa, s.gia_tri]))
        if (map.cham_cong_nguong_di_muon_phut) setLateThreshold(map.cham_cong_nguong_di_muon_phut)
        if (map.cham_cong_nguong_ve_som_phut) setEarlyThreshold(map.cham_cong_nguong_ve_som_phut)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await setValue('cham_cong_nguong_di_muon_phut', lateThreshold, 'Ngưỡng đi muộn (phút) trước khi tính là Đi muộn')
      await setValue('cham_cong_nguong_ve_som_phut', earlyThreshold, 'Ngưỡng về sớm (phút) trước khi tính là Về sớm')
      setMessage({ type: 'success', text: 'Đã lưu.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Card className="p-5"><LoadingState /></Card>

  return (
    <Card className="p-5">
      <h3 className="font-display font-semibold text-[var(--color-ink)] mb-4">Ngưỡng chấm công</h3>
      <form onSubmit={handleSave} className="flex items-end gap-3">
        <Input label="Ngưỡng đi muộn (phút)" type="number" disabled={readOnly} value={lateThreshold} onChange={(e) => setLateThreshold(e.target.value)} className="max-w-[160px]" />
        <Input label="Ngưỡng về sớm (phút)" type="number" disabled={readOnly} value={earlyThreshold} onChange={(e) => setEarlyThreshold(e.target.value)} className="max-w-[160px]" />
        {!readOnly && <Button type="submit" variant="accent" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>}
        {message && <span className={`text-sm ${message.type === 'error' ? 'text-[var(--color-danger)]' : 'text-[var(--color-good)]'}`}>{message.text}</span>}
      </form>
    </Card>
  )
}

// ============================================================
// LỊCH SAO LƯU LÊN GOOGLE DRIVE
// ============================================================
function LichBackupSection() {
  const [days, setDays] = useState('7')
  const [lastRun, setLastRun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const all = await getAllSettings()
        const map = Object.fromEntries(all.map((s) => [s.khoa, s.gia_tri]))
        if (map.backup_interval_days) setDays(map.backup_interval_days)
        if (map.backup_last_run_at) setLastRun(map.backup_last_run_at)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await setValue('backup_interval_days', days, 'Số ngày giữa các lần sao lưu tự động lên Google Drive')
      setMessage({ type: 'success', text: 'Đã lưu.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Card className="p-5"><LoadingState /></Card>

  return (
    <Card className="p-5">
      <h3 className="font-display font-semibold text-[var(--color-ink)] mb-1">Lịch sao lưu lên Google Drive</h3>
      <p className="text-sm text-[var(--color-text-muted)] mb-4">
        Cần thiết lập GitHub Actions + Google Drive Service Account trước — xem README mục Backup.
      </p>
      <form onSubmit={handleSave} className="flex items-end gap-3 mb-3">
        <Input label="Số ngày giữa các lần backup" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} className="max-w-[180px]" />
        <Button type="submit" variant="accent" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
        {message && <span className={`text-sm ${message.type === 'error' ? 'text-[var(--color-danger)]' : 'text-[var(--color-good)]'}`}>{message.text}</span>}
      </form>
      <p className="text-xs text-[var(--color-text-muted)]">
        Lần backup gần nhất: {lastRun ? new Date(lastRun).toLocaleString('vi-VN') : 'Chưa có lần nào'}
      </p>
    </Card>
  )
}

// ============================================================
// SAO LƯU DỮ LIỆU THỦ CÔNG
// ============================================================
function SaoLuuThuCongSection() {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(null)

  async function handleExport() {
    setExporting(true)
    setError(null)
    try {
      const data = await exportAllDataForBackup()
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qlnv-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Card className="p-5">
      <h3 className="font-display font-semibold text-[var(--color-ink)] mb-1">Sao lưu dữ liệu thủ công</h3>
      <p className="text-sm text-[var(--color-text-muted)] mb-4">
        Tải toàn bộ dữ liệu hiện tại về máy dưới dạng file JSON — dùng trước khi làm thao tác rủi ro.
      </p>
      <div className="flex items-center gap-3">
        <Button variant="accent" onClick={handleExport} disabled={exporting}>{exporting ? 'Đang xuất...' : '⬇ Tải file backup (.json)'}</Button>
        {error && <ErrorState message={error} />}
      </div>
    </Card>
  )
}
