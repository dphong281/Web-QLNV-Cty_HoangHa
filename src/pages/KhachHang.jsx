import { useEffect, useState } from 'react'
import { getAllCustomers, createCustomer, updateCustomer, deactivateCustomer, reactivateCustomer } from '../lib/customerQueries'
import { Card, Button, Badge, Input, Modal, LoadingState, ErrorState, EmptyState } from '../components/ui'

const EMPTY_FORM = { ten_khach_hang: '', so_dt: '', dia_chi: '', email: '', nhom_kh: '', loai_kh: '', ma_nv_phu_trach: '' }

export default function KhachHang() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setList(await getAllCustomers())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(c) {
    setEditing(c)
    setForm({ ...EMPTY_FORM, ...c })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.ten_khach_hang?.trim()) {
      setFormError('Tên khách hàng không được để trống.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editing) await updateCustomer(editing.ma_kh, form)
      else await createCustomer(form)
      setModalOpen(false)
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(c) {
    try {
      if (c.trang_thai === 'DangGiaoDich') await deactivateCustomer(c.ma_kh)
      else await reactivateCustomer(c.ma_kh)
      load()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
  }

  const filtered = list.filter((c) => {
    if (!search) return true
    const kw = search.toLowerCase()
    return c.ma_kh?.toLowerCase().includes(kw) || c.ten_khach_hang?.toLowerCase().includes(kw) || c.so_dt?.includes(search)
  })

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">Khách hàng</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{list.length} khách hàng</p>
        </div>
        <Button variant="accent" onClick={openAdd}>+ Thêm khách hàng</Button>
      </div>

      <input
        placeholder="Tìm theo mã, tên, SĐT, email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-xs px-3 py-2 rounded-lg border border-[var(--color-line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
      />

      <Card className="overflow-x-auto">
        {loading ? <LoadingState /> : error ? <div className="p-4"><ErrorState message={error} /></div> : filtered.length === 0 ? (
          <EmptyState title="Chưa có khách hàng nào" action={<Button variant="accent" onClick={openAdd}>+ Thêm khách hàng</Button>} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide border-b border-[var(--color-line)]">
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Mã KH</th>
                <th className="px-4 py-3 font-medium sticky left-0 bg-[var(--color-surface)]">Tên khách hàng</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Liên hệ</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Nhóm</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Phụ trách</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.ma_kh} className="border-b border-[var(--color-line)] last:border-0 hover:bg-black/[0.015]">
                  <td className="px-4 py-2.5 font-medium text-[var(--color-ink)] hidden sm:table-cell">{c.ma_kh}</td>
                  <td className="px-4 py-2.5 sticky left-0 bg-[var(--color-surface)]">
                    {c.ten_khach_hang}
                    <div className="text-xs text-[var(--color-text-muted)] md:hidden">{c.so_dt || c.email || '—'}</div>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)] hidden md:table-cell">{c.so_dt || c.email || '—'}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)] hidden md:table-cell">{c.nhom_kh || '—'}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)] hidden lg:table-cell">{c.tenNvPhuTrach || '—'}</td>
                  <td className="px-4 py-2.5">
                    <Badge className={c.trang_thai === 'DangGiaoDich' ? 'bg-[var(--color-good)]/10 text-[var(--color-good)]' : 'bg-black/5 text-[var(--color-text-muted)]'}>
                      {c.trang_thai === 'DangGiaoDich' ? 'Đang giao dịch' : 'Ngừng giao dịch'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right space-x-2">
                    <button onClick={() => openEdit(c)} className="text-[var(--color-ink)] hover:underline text-sm font-medium">Sửa</button>
                    <button onClick={() => handleToggleActive(c)} className="text-[var(--color-text-muted)] hover:underline text-sm font-medium">
                      {c.trang_thai === 'DangGiaoDich' ? 'Ngừng GD' : 'Kích hoạt lại'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa khách hàng' : 'Thêm khách hàng'} wide>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Tên khách hàng *" required value={form.ten_khach_hang} onChange={(e) => setForm({ ...form, ten_khach_hang: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Số điện thoại" value={form.so_dt || ''} onChange={(e) => setForm({ ...form, so_dt: e.target.value })} />
            <Input label="Email" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <Input label="Địa chỉ" value={form.dia_chi || ''} onChange={(e) => setForm({ ...form, dia_chi: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Nhóm KH" value={form.nhom_kh || ''} onChange={(e) => setForm({ ...form, nhom_kh: e.target.value })} placeholder="VD: Doanh nghiệp" />
            <Input label="Loại KH" value={form.loai_kh || ''} onChange={(e) => setForm({ ...form, loai_kh: e.target.value })} placeholder="VD: Thân thiết" />
            <Input label="Mã NV phụ trách" value={form.ma_nv_phu_trach || ''} onChange={(e) => setForm({ ...form, ma_nv_phu_trach: e.target.value })} />
          </div>
          {formError && <ErrorState message={formError} />}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Huỷ</Button>
            <Button type="submit" variant="accent" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
