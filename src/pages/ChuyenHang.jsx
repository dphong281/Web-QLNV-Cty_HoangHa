import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getAvailableDrivers, getAllXeBon, createShipment, updateShipmentStatus, getShipmentsDisplay,
} from '../lib/shipmentQueries'
import { getAllDonVi } from '../lib/shiftQueries'
import { Card, Button, Badge, Input, Select, Modal, LoadingState, ErrorState, EmptyState } from '../components/ui'

const TRANG_THAI_LABELS = { DangDi: 'Đang đi', HoanThanh: 'Hoàn thành', HuyChuyen: 'Huỷ chuyến' }
const TRANG_THAI_COLORS = {
  DangDi: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  HoanThanh: 'bg-[var(--color-good)]/10 text-[var(--color-good)]',
  HuyChuyen: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
}

const EMPTY_FORM = { ma_nv: '', id_xe: '', id_don_vi_di: '', id_don_vi_den: '', loai_nhien_lieu: '', so_luong_lit: '', ngay_di: '' }

export default function ChuyenHang() {
  const [list, setList] = useState([])
  const [drivers, setDrivers] = useState([])
  const [xeList, setXeList] = useState([])
  const [donViList, setDonViList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => { load() }, [filterStatus])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [ship, dv] = await Promise.all([
        getShipmentsDisplay({ status: filterStatus === 'all' ? null : filterStatus }),
        getAllDonVi(),
      ])
      setList(ship)
      setDonViList(dv)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function openAdd() {
    setFormError(null)
    setForm(EMPTY_FORM)
    try {
      const [dr, xe] = await Promise.all([getAvailableDrivers(), getAllXeBon()])
      setDrivers(dr)
      setXeList(xe)
      setModalOpen(true)
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setFormError(null)
    if (!form.ma_nv || !form.id_xe || !form.id_don_vi_di || !form.id_don_vi_den || !form.ngay_di) {
      setFormError('Vui lòng điền đầy đủ tài xế, xe, điểm đi, điểm đến, ngày đi.')
      return
    }
    setSaving(true)
    try {
      await createShipment({ ...form, so_luong_lit: Number(form.so_luong_lit) || 0 })
      setModalOpen(false)
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateStatus(s, status) {
    const extra = {}
    if (status === 'HoanThanh') extra.ngay_ve = new Date().toISOString()
    if (status === 'HuyChuyen') {
      const lyDoHuy = prompt('Lý do huỷ chuyến:')
      if (lyDoHuy === null) return
      extra.ly_do_huy = lyDoHuy
    }
    try {
      await updateShipmentStatus(s.id, status, extra)
      load()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">Chuyến hàng</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{list.length} chuyến</p>
        </div>
        <Button variant="accent" onClick={openAdd}>+ Tạo chuyến mới</Button>
      </div>

      <div className="mb-4">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--color-line)] bg-white text-sm">
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(TRANG_THAI_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <Card>
        {loading ? <LoadingState /> : error ? <div className="p-4"><ErrorState message={error} /></div> : list.length === 0 ? (
          <EmptyState title="Chưa có chuyến hàng nào" action={<Button variant="accent" onClick={openAdd}>+ Tạo chuyến mới</Button>} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide border-b border-[var(--color-line)]">
                <th className="px-4 py-3 font-medium">Mã chuyến</th>
                <th className="px-4 py-3 font-medium">Tài xế</th>
                <th className="px-4 py-3 font-medium">Xe</th>
                <th className="px-4 py-3 font-medium">Tuyến</th>
                <th className="px-4 py-3 font-medium text-right">Số lít</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-b border-[var(--color-line)] last:border-0 hover:bg-black/[0.015]">
                  <td className="px-4 py-2.5 font-medium text-[var(--color-ink)]">{s.maChuyen}</td>
                  <td className="px-4 py-2.5"><Link to={`/nhan-su?detail=${s.driverMaNv}`} className="hover:underline">{s.driverName}</Link></td>
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{s.plateNumber}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{s.diemDi} → {s.diemDen}</td>
                  <td className="px-4 py-2.5 text-right">{s.soLuongLit?.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-2.5"><Badge className={TRANG_THAI_COLORS[s.status]}>{TRANG_THAI_LABELS[s.status]}</Badge></td>
                  <td className="px-4 py-2.5 text-right space-x-2">
                    {s.status === 'DangDi' && (
                      <>
                        <button onClick={() => handleUpdateStatus(s, 'HoanThanh')} className="text-[var(--color-good)] hover:underline text-sm font-medium">Hoàn thành</button>
                        <button onClick={() => handleUpdateStatus(s, 'HuyChuyen')} className="text-[var(--color-danger)] hover:underline text-sm font-medium">Huỷ</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tạo chuyến hàng mới" wide>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Tài xế *" value={form.ma_nv} onChange={(e) => setForm({ ...form, ma_nv: e.target.value })}>
              <option value="">— Chọn tài xế (đang rảnh) —</option>
              {drivers.map((d) => <option key={d.maNv} value={d.maNv}>{d.hoTen} ({d.maNv})</option>)}
            </Select>
            <Select label="Xe bồn *" value={form.id_xe} onChange={(e) => setForm({ ...form, id_xe: e.target.value })}>
              <option value="">— Chọn xe —</option>
              {xeList.map((x) => <option key={x.id} value={x.id}>{x.bien_so}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Điểm đi *" value={form.id_don_vi_di} onChange={(e) => setForm({ ...form, id_don_vi_di: e.target.value })}>
              <option value="">— Chọn —</option>
              {donViList.map((d) => <option key={d.id} value={d.id}>{d.ten_don_vi}</option>)}
            </Select>
            <Select label="Điểm đến *" value={form.id_don_vi_den} onChange={(e) => setForm({ ...form, id_don_vi_den: e.target.value })}>
              <option value="">— Chọn —</option>
              {donViList.map((d) => <option key={d.id} value={d.id}>{d.ten_don_vi}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Loại nhiên liệu" value={form.loai_nhien_lieu} onChange={(e) => setForm({ ...form, loai_nhien_lieu: e.target.value })} placeholder="VD: Xăng A95" />
            <Input label="Số lít" type="number" value={form.so_luong_lit} onChange={(e) => setForm({ ...form, so_luong_lit: e.target.value })} />
            <Input label="Ngày đi *" type="datetime-local" value={form.ngay_di} onChange={(e) => setForm({ ...form, ngay_di: e.target.value })} />
          </div>
          {formError && <ErrorState message={formError} />}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Huỷ</Button>
            <Button type="submit" variant="accent" disabled={saving}>{saving ? 'Đang tạo...' : 'Tạo chuyến'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
