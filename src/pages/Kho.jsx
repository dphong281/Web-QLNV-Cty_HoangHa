import { useEffect, useState } from 'react'
import { getAllInventory, createInventoryRecord, deleteInventoryRecord } from '../lib/inventoryQueries'
import { getAllDonVi } from '../lib/shiftQueries'
import { formatDate } from '../lib/format'
import { Card, Button, Badge, Input, Select, Modal, LoadingState, ErrorState, EmptyState } from '../components/ui'

const LOAI_LABELS = { NhapKho: 'Nhập kho', XuatKho: 'Xuất kho' }
const EMPTY_FORM = { id_don_vi: '', loai: 'NhapKho', so_luong_lit: '', ngay: '', ghi_chu: '' }

export default function Kho() {
  const [list, setList] = useState([])
  const [donViList, setDonViList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterLoai, setFilterLoai] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [filterLoai])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [inv, dv] = await Promise.all([
        getAllInventory({ loai: filterLoai === 'all' ? null : filterLoai }),
        getAllDonVi(),
      ])
      setList(inv)
      setDonViList(dv)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM, ngay: new Date().toISOString().slice(0, 10) })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await createInventoryRecord({ ...form, so_luong_lit: Number(form.so_luong_lit) || 0 })
      setModalOpen(false)
      load()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Xoá bản ghi này?')) return
    try {
      await deleteInventoryRecord(id)
      load()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
  }

  const tongNhap = list.filter((r) => r.loai === 'NhapKho').reduce((s, r) => s + (r.so_luong_lit || 0), 0)
  const tongXuat = list.filter((r) => r.loai === 'XuatKho').reduce((s, r) => s + (r.so_luong_lit || 0), 0)

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">Kho</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Nhật ký nhập/xuất kho</p>
        </div>
        <Button variant="accent" onClick={openAdd}>+ Ghi nhận nhập/xuất</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Card className="p-4">
          <div className="text-xs text-[var(--color-text-muted)] uppercase">Tổng nhập (lít)</div>
          <div className="font-display text-xl font-semibold text-[var(--color-good)]">{tongNhap.toLocaleString('vi-VN')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-[var(--color-text-muted)] uppercase">Tổng xuất (lít)</div>
          <div className="font-display text-xl font-semibold text-[var(--color-danger)]">{tongXuat.toLocaleString('vi-VN')}</div>
        </Card>
      </div>

      <div className="mb-4">
        <select value={filterLoai} onChange={(e) => setFilterLoai(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--color-line)] bg-white text-sm">
          <option value="all">Tất cả</option>
          {Object.entries(LOAI_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <Card className="overflow-x-auto">
        {loading ? <LoadingState /> : error ? <div className="p-4"><ErrorState message={error} /></div> : list.length === 0 ? (
          <EmptyState title="Chưa có bản ghi nào" action={<Button variant="accent" onClick={openAdd}>+ Ghi nhận nhập/xuất</Button>} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide border-b border-[var(--color-line)]">
                <th className="px-4 py-3 font-medium sticky left-0 bg-[var(--color-surface)]">Ngày</th>
                <th className="px-4 py-3 font-medium">Đơn vị</th>
                <th className="px-4 py-3 font-medium">Loại</th>
                <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">Số lít</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Ghi chú</th>
                <th className="px-4 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-[var(--color-line)] last:border-0 hover:bg-black/[0.015]">
                  <td className="px-4 py-2.5 sticky left-0 bg-[var(--color-surface)]">{formatDate(r.ngay)}</td>
                  <td className="px-4 py-2.5">
                    {r.tenDonVi}
                    <div className="text-xs text-[var(--color-text-muted)] sm:hidden">{(r.so_luong_lit || 0).toLocaleString('vi-VN')} lít</div>
                  </td>
                  <td className="px-4 py-2.5"><Badge className={r.loai === 'NhapKho' ? 'bg-[var(--color-good)]/10 text-[var(--color-good)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'}>{LOAI_LABELS[r.loai]}</Badge></td>
                  <td className="px-4 py-2.5 text-right hidden sm:table-cell">{(r.so_luong_lit || 0).toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)] hidden md:table-cell">{r.ghi_chu || '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => handleDelete(r.id)} className="text-[var(--color-danger)] hover:underline text-sm font-medium">Xoá</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Ghi nhận nhập/xuất kho">
        <form onSubmit={handleSave} className="space-y-4">
          <Select label="Đơn vị *" required value={form.id_don_vi} onChange={(e) => setForm({ ...form, id_don_vi: e.target.value })}>
            <option value="">— Chọn đơn vị —</option>
            {donViList.map((d) => <option key={d.id} value={d.id}>{d.ten_don_vi}</option>)}
          </Select>
          <Select label="Loại" value={form.loai} onChange={(e) => setForm({ ...form, loai: e.target.value })}>
            {Object.entries(LOAI_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Số lít *" type="number" required value={form.so_luong_lit} onChange={(e) => setForm({ ...form, so_luong_lit: e.target.value })} />
            <Input label="Ngày *" type="date" required value={form.ngay} onChange={(e) => setForm({ ...form, ngay: e.target.value })} />
          </div>
          <Input label="Ghi chú" value={form.ghi_chu} onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Huỷ</Button>
            <Button type="submit" variant="accent" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
