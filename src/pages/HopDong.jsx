import { useEffect, useState } from 'react'
import {
  getContractsTable, createContractLogic, updateContractLogic, liquidateContract, ConflictError,
} from '../lib/contractQueries'
import { LOAI_HD_LABELS, formatCurrency, formatDate } from '../lib/format'
import { exportToExcel } from '../lib/excelImport'
import { Card, Button, Badge, Input, Select, Modal, LoadingState, ErrorState, EmptyState } from '../components/ui'
import PrintContractModal from '../components/PrintContractModal'

const TRANG_THAI_HIEN_THI_LABELS = {
  DangHieuLuc: 'Đang hiệu lực', SapHetHan: 'Sắp hết hạn', DaHetHan: 'Đã hết hạn', DaThanhLy: 'Đã thanh lý',
}
const TRANG_THAI_HIEN_THI_COLORS = {
  DangHieuLuc: 'bg-[var(--color-good)]/10 text-[var(--color-good)]',
  SapHetHan: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  DaHetHan: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
  DaThanhLy: 'bg-black/5 text-[var(--color-text-muted)]',
}

const EMPTY_FORM = {
  maNv: '', loaiHd: 'ThuViec', ngayKy: '', ngayHieuLuc: '', ngayHetHan: '',
  luongCoBan: '', phuCapDocHai: '0', phuCapTrachNhiem: '0', ketQuaDanhGia: 'Chưa đánh giá',
}
const KET_QUA_DANH_GIA_OPTIONS = ['Chưa đánh giá', 'Đạt', 'Không đạt']

export default function HopDong() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filterTrangThai, setFilterTrangThai] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [printTarget, setPrintTarget] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setList(await getContractsTable())
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
    setForm({
      maNv: c.ma_nv, loaiHd: c.loai_hd, ngayKy: c.ngay_ky, ngayHieuLuc: c.ngay_hieu_luc,
      ngayHetHan: c.ngay_het_han || '', luongCoBan: String(c.luong_co_ban),
      phuCapDocHai: String(c.phu_cap_doc_hai), phuCapTrachNhiem: String(c.phu_cap_trach_nhiem),
      ketQuaDanhGia: c.ket_qua_danh_gia || 'Chưa đánh giá',
      expectedUpdatedAt: c.updated_at,
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      if (editing) {
        await updateContractLogic(editing.ma_hd, form)
      } else {
        await createContractLogic(form)
      }
      setModalOpen(false)
      load()
    } catch (err) {
      if (err instanceof ConflictError) {
        setFormError(err.message)
        setModalOpen(false)
        load()
      } else {
        setFormError(err.message)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleLiquidate(c) {
    if (!confirm(`Thanh lý hợp đồng "${c.ma_hd}" của ${c.hoTen}?`)) return
    try {
      await liquidateContract(c.ma_hd)
      load()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
  }

  function handleExportExpiring() {
    const expiring = list.filter((c) => c.trangThaiHienThi === 'SapHetHan')
    if (!expiring.length) {
      alert('Không có hợp đồng nào sắp hết hạn.')
      return
    }
    const headers = ['Mã HĐ', 'Mã NV', 'Họ tên', 'Khối', 'Loại HĐ', 'Ngày ký', 'Ngày hết hạn', 'Lương cơ bản']
    const rows = expiring.map((c) => [c.ma_hd, c.ma_nv, c.hoTen, c.khoi, c.loaiHdHienThi, c.ngay_ky, c.ngay_het_han, c.luong_co_ban])
    exportToExcel(headers, rows, `HopDongSapHetHan_${new Date().toISOString().slice(0, 10)}.xlsx`, 'HopDongSapHetHan')
  }

  const filtered = list.filter((c) => {
    const matchSearch = !search || c.ma_hd?.toLowerCase().includes(search.toLowerCase()) || c.ma_nv?.toLowerCase().includes(search.toLowerCase()) || c.hoTen?.toLowerCase().includes(search.toLowerCase())
    const matchTrangThai = filterTrangThai === 'all' || c.trangThaiHienThi === filterTrangThai
    return matchSearch && matchTrangThai
  })

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">Hợp đồng lao động</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{list.length} hợp đồng</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setPrintTarget({ maNv: '', loaiVanBan: 'ThuViec', contract: null })}>🖨 In hợp đồng / quyết định</Button>
          <Button variant="accent" onClick={openAdd}>+ Ký hợp đồng mới</Button>
        </div>
      </div>

      <div className="mb-4">
        <Button variant="ghost" onClick={handleExportExpiring}>⬇ Xuất Excel hợp đồng sắp hết hạn</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <input placeholder="Tìm theo mã HĐ, mã NV, tên..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 rounded-lg border border-[var(--color-line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40" />
        <select value={filterTrangThai} onChange={(e) => setFilterTrangThai(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--color-line)] bg-white text-sm">
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(TRANG_THAI_HIEN_THI_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <Card>
        {loading ? <LoadingState /> : error ? <div className="p-4"><ErrorState message={error} /></div> : filtered.length === 0 ? (
          <EmptyState title="Chưa có hợp đồng nào" action={<Button variant="accent" onClick={openAdd}>+ Ký hợp đồng mới</Button>} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide border-b border-[var(--color-line)]">
                <th className="px-5 py-3 font-medium">Mã HĐ</th>
                <th className="px-5 py-3 font-medium">Nhân viên</th>
                <th className="px-5 py-3 font-medium">Loại HĐ</th>
                <th className="px-5 py-3 font-medium">Thời hạn</th>
                <th className="px-5 py-3 font-medium text-right">Lương cơ bản</th>
                <th className="px-5 py-3 font-medium">Trạng thái</th>
                <th className="px-5 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.ma_hd} className="border-b border-[var(--color-line)] last:border-0 hover:bg-black/[0.015]">
                  <td className="px-5 py-3 font-medium text-[var(--color-ink)]">{c.ma_hd}</td>
                  <td className="px-5 py-3">{c.hoTen} <span className="text-xs text-[var(--color-text-muted)]">({c.ma_nv})</span></td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)]">
                    {c.loaiHdHienThi}
                    {c.loai_hd === 'ThuViec' && c.ket_qua_danh_gia && c.ket_qua_danh_gia !== 'Chưa đánh giá' && (
                      <Badge className={c.ket_qua_danh_gia === 'Đạt' ? 'bg-[var(--color-good)]/10 text-[var(--color-good)] ml-2' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] ml-2'}>{c.ket_qua_danh_gia}</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)]">{formatDate(c.ngay_hieu_luc)} → {c.ngay_het_han ? formatDate(c.ngay_het_han) : 'Không XĐ'}</td>
                  <td className="px-5 py-3 text-right font-medium">{formatCurrency(c.luong_co_ban)}</td>
                  <td className="px-5 py-3"><Badge className={TRANG_THAI_HIEN_THI_COLORS[c.trangThaiHienThi]}>{TRANG_THAI_HIEN_THI_LABELS[c.trangThaiHienThi]}</Badge></td>
                  <td className="px-5 py-3 text-right space-x-2">
                    <button onClick={() => setPrintTarget({ maNv: c.ma_nv, loaiVanBan: c.loai_hd === 'ThuViec' ? 'ThuViec' : 'HopDongLaoDong', contract: c })} className="text-[var(--color-ink)] hover:underline text-sm font-medium">In</button>
                    {c.trangThaiHienThi !== 'DaThanhLy' && (
                      <>
                        <button onClick={() => openEdit(c)} className="text-[var(--color-ink)] hover:underline text-sm font-medium">Sửa</button>
                        <button onClick={() => handleLiquidate(c)} className="text-[var(--color-danger)] hover:underline text-sm font-medium">Thanh lý</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Sửa hợp đồng ${editing.ma_hd}` : 'Ký hợp đồng mới'} wide>
        <form onSubmit={handleSave} className="space-y-4">
          {!editing && (
            <Input label="Mã nhân viên *" required value={form.maNv} onChange={(e) => setForm({ ...form, maNv: e.target.value })} placeholder="VD: HH011" />
          )}
          <div className="grid grid-cols-2 gap-4">
            <Select label="Loại hợp đồng" value={form.loaiHd} onChange={(e) => setForm({ ...form, loaiHd: e.target.value })}>
              {Object.entries(LOAI_HD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            {!editing && <Input label="Ngày ký *" type="date" required value={form.ngayKy} onChange={(e) => setForm({ ...form, ngayKy: e.target.value })} />}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {!editing && <Input label="Ngày hiệu lực *" type="date" required value={form.ngayHieuLuc} onChange={(e) => setForm({ ...form, ngayHieuLuc: e.target.value })} />}
            <Input label="Ngày hết hạn (để trống nếu không xác định)" type="date" value={form.ngayHetHan} onChange={(e) => setForm({ ...form, ngayHetHan: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Lương cơ bản *" type="number" required value={form.luongCoBan} onChange={(e) => setForm({ ...form, luongCoBan: e.target.value })} />
            <Input label="Phụ cấp độc hại" type="number" value={form.phuCapDocHai} onChange={(e) => setForm({ ...form, phuCapDocHai: e.target.value })} />
            <Input label="Phụ cấp trách nhiệm" type="number" value={form.phuCapTrachNhiem} onChange={(e) => setForm({ ...form, phuCapTrachNhiem: e.target.value })} />
          </div>
          {form.loaiHd === 'ThuViec' && (
            <Select label="Kết quả đánh giá thử việc" value={form.ketQuaDanhGia} onChange={(e) => setForm({ ...form, ketQuaDanhGia: e.target.value })}>
              {KET_QUA_DANH_GIA_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </Select>
          )}
          {formError && <ErrorState message={formError} />}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Huỷ</Button>
            <Button type="submit" variant="accent" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
          </div>
        </form>
      </Modal>

      <PrintContractModal
        open={!!printTarget}
        onClose={() => setPrintTarget(null)}
        initialMaNv={printTarget?.maNv}
        initialLoaiVanBan={printTarget?.loaiVanBan}
        contract={printTarget?.contract}
      />
    </div>
  )
}
