import { useEffect, useState } from 'react'
import {
  getAllEmployees, createEmployee, updateEmployee, deactivateEmployee, importEmployeesFromExcel,
} from '../lib/employeeQueries'
import { KHOI_LABELS, TRANG_THAI_NV_LABELS, TRANG_THAI_NV_COLORS, formatDate } from '../lib/format'
import { NHAN_VIEN_SYNONYMS, NHAN_VIEN_REQUIRED, NHAN_VIEN_HEADERS } from '../lib/importSynonyms'
import { cellValue, cellDateToIso, exportToExcel } from '../lib/excelImport'
import ExcelImportModal from '../components/ExcelImportModal'
import { Card, Button, Badge, Input, Select, Textarea, Modal, LoadingState, ErrorState, EmptyState } from '../components/ui'

const KHOI_LABEL_TO_CODE = Object.fromEntries(Object.entries(KHOI_LABELS).map(([k, v]) => [v, k]))
const TRANG_THAI_LABEL_TO_CODE = Object.fromEntries(Object.entries(TRANG_THAI_NV_LABELS).map(([k, v]) => [v, k]))

const EMPTY_FORM = {
  'Mã NV': '', 'Họ tên': '', 'Ngày sinh': '', 'Giới tính': 'Nam', 'Số CCCD': '',
  'Ngày cấp CCCD': '', 'Nơi cấp': '', 'Địa chỉ thường trú': '', 'Số ĐT': '', 'Email': '',
  'Khối': 'VanPhong', 'Chức vụ': '', 'Nơi làm việc': '', 'Ngạch': '', 'Ngày vào Cty': '',
  'Trạng thái': 'DangLamViec', 'Quyết định đi kèm': '', 'Ghi chú': '',
  'Thông tin học vấn': '', 'Thông tin gia đình': '',
}

export default function NhanSu() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filterKhoi, setFilterKhoi] = useState('all')
  const [filterTrangThai, setFilterTrangThai] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [detail, setDetail] = useState(null)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setList(await getAllEmployees())
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

  function openEdit(emp) {
    setEditing(emp)
    setForm({ ...EMPTY_FORM, ...emp })
    setFormError(null)
    setModalOpen(true)
    setDetail(null)
  }

  async function handleSave(e) {
    e.preventDefault()
    setFormError(null)

    let maNv = form['Mã NV'].trim()
    let hoTen = form['Họ tên'].trim().replace(/\s+/g, ' ')
    const phone = form['Số ĐT'].trim()
    const position = form['Chức vụ'].trim().replace(/\s+/g, ' ')
    const unit = form['Nơi làm việc'].trim().replace(/\s+/g, ' ')

    if (!maNv || !hoTen || !phone || !position || !unit) {
      setFormError('Vui lòng không để trống bất kỳ trường bắt buộc nào (Mã NV, Họ tên, SĐT, Chức vụ, Nơi làm việc).')
      return
    }
    if (/\s/.test(maNv)) {
      setFormError('Mã nhân viên không được chứa dấu cách.')
      return
    }
    maNv = maNv.toUpperCase()
    if (!/^[\p{L}\s]+$/u.test(hoTen)) {
      setFormError('Họ tên chỉ được chứa chữ cái.')
      return
    }
    hoTen = hoTen.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
    if (!/^0\d{9}$/.test(phone)) {
      setFormError('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0.')
      return
    }

    const payload = { ...form, 'Mã NV': maNv, 'Họ tên': hoTen, 'Số ĐT': phone, 'Chức vụ': position, 'Nơi làm việc': unit }

    setSaving(true)
    try {
      if (editing) {
        const { 'Mã NV': _omit, ...rest } = payload
        await updateEmployee(editing['Mã NV'], rest)
      } else {
        await createEmployee(payload)
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(emp) {
    if (!confirm(`Chuyển "${emp['Họ tên']}" sang trạng thái Đã nghỉ việc?`)) return
    try {
      await deactivateEmployee(emp['Mã NV'])
      load()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
  }

  function handleExport() {
    const rows = list.map((e) => NHAN_VIEN_HEADERS.map((h) => e[h] ?? ''))
    exportToExcel(NHAN_VIEN_HEADERS, rows, `DS_NhanVien_${new Date().toISOString().slice(0, 10)}.xlsx`, 'DS_NhanVien')
  }

  function buildImportRow(row, colMap) {
    const maNv = String(cellValue(row, colMap, 'Mã NV')).trim().toUpperCase()
    if (!maNv) return null
    const data = { 'Mã NV': maNv }
    for (const h of NHAN_VIEN_HEADERS) {
      if (h === 'Mã NV' || h === 'Ngày vào Cty') continue
      data[h] = String(cellValue(row, colMap, h, '')).trim()
    }
    data['Giới tính'] = data['Giới tính'] || 'Nam'
    data['Khối'] = KHOI_LABEL_TO_CODE[data['Khối']] || data['Khối'] || 'VanPhong'
    data['Trạng thái'] = TRANG_THAI_LABEL_TO_CODE[data['Trạng thái']] || data['Trạng thái'] || 'DangLamViec'
    data['Ngày vào Cty'] = cellDateToIso(row, colMap, 'Ngày vào Cty') || null
    return data
  }

  const filtered = list.filter((e) => {
    const matchSearch =
      !search ||
      e['Mã NV']?.toLowerCase().includes(search.toLowerCase()) ||
      e['Họ tên']?.toLowerCase().includes(search.toLowerCase()) ||
      e['Số ĐT']?.includes(search)
    const matchKhoi = filterKhoi === 'all' || e['Khối'] === filterKhoi
    const matchTrangThai = filterTrangThai === 'all' || e['Trạng thái'] === filterTrangThai
    return matchSearch && matchKhoi && matchTrangThai
  })

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">Nhân sự</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{list.length} nhân viên trong hệ thống</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleExport}>⬇ Xuất Excel</Button>
          <Button variant="ghost" onClick={() => setImportOpen(true)}>📥 Nhập Excel</Button>
          <Button variant="accent" onClick={openAdd}>+ Thêm nhân viên</Button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          placeholder="Tìm theo Mã NV, tên, SĐT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 rounded-lg border border-[var(--color-line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
        />
        <select value={filterKhoi} onChange={(e) => setFilterKhoi(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--color-line)] bg-white text-sm">
          <option value="all">Tất cả khối</option>
          {Object.entries(KHOI_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterTrangThai} onChange={(e) => setFilterTrangThai(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--color-line)] bg-white text-sm">
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(TRANG_THAI_NV_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <Card>
        {loading ? <LoadingState /> : error ? <div className="p-4"><ErrorState message={error} /></div> : filtered.length === 0 ? (
          <EmptyState title="Không có nhân viên nào" action={<Button variant="accent" onClick={openAdd}>+ Thêm nhân viên</Button>} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide border-b border-[var(--color-line)]">
                <th className="px-5 py-3 font-medium">Mã NV</th>
                <th className="px-5 py-3 font-medium">Họ tên</th>
                <th className="px-5 py-3 font-medium">Khối</th>
                <th className="px-5 py-3 font-medium">Chức vụ</th>
                <th className="px-5 py-3 font-medium">Nơi làm việc</th>
                <th className="px-5 py-3 font-medium">Trạng thái</th>
                <th className="px-5 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp['Mã NV']} className="border-b border-[var(--color-line)] last:border-0 hover:bg-black/[0.015]">
                  <td className="px-5 py-3 font-medium text-[var(--color-ink)]">
                    <button onClick={() => setDetail(emp)} className="hover:underline">{emp['Mã NV']}</button>
                  </td>
                  <td className="px-5 py-3">{emp['Họ tên']}</td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)]">{KHOI_LABELS[emp['Khối']] || emp['Khối']}</td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)]">{emp['Chức vụ']}</td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)]">{emp['Nơi làm việc']}</td>
                  <td className="px-5 py-3">
                    <Badge className={TRANG_THAI_NV_COLORS[emp['Trạng thái']]}>{TRANG_THAI_NV_LABELS[emp['Trạng thái']] || emp['Trạng thái']}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(emp)} className="text-[var(--color-ink)] hover:underline text-sm font-medium">Sửa</button>
                    {emp['Trạng thái'] !== 'DaNghiViec' && (
                      <button onClick={() => handleDeactivate(emp)} className="text-[var(--color-danger)] hover:underline text-sm font-medium">Cho nghỉ</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modal xem chi tiết nhanh */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `${detail['Mã NV']} — ${detail['Họ tên']}` : ''} wide>
        {detail && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><span className="text-[var(--color-text-muted)]">Ngày sinh:</span> {detail['Ngày sinh'] || '—'}</div>
            <div><span className="text-[var(--color-text-muted)]">Giới tính:</span> {detail['Giới tính'] || '—'}</div>
            <div><span className="text-[var(--color-text-muted)]">Số CCCD:</span> {detail['Số CCCD'] || '—'}</div>
            <div><span className="text-[var(--color-text-muted)]">Ngày cấp:</span> {detail['Ngày cấp CCCD'] || '—'} tại {detail['Nơi cấp'] || '—'}</div>
            <div className="col-span-2"><span className="text-[var(--color-text-muted)]">Địa chỉ:</span> {detail['Địa chỉ thường trú'] || '—'}</div>
            <div><span className="text-[var(--color-text-muted)]">SĐT:</span> {detail['Số ĐT'] || '—'}</div>
            <div><span className="text-[var(--color-text-muted)]">Email:</span> {detail['Email'] || '—'}</div>
            <div><span className="text-[var(--color-text-muted)]">Ngạch:</span> {detail['Ngạch'] || '—'}</div>
            <div><span className="text-[var(--color-text-muted)]">Ngày vào Cty:</span> {formatDate(detail['Ngày vào Cty'])}</div>
            <div><span className="text-[var(--color-text-muted)]">Quyết định:</span> {detail['Quyết định đi kèm'] || '—'}</div>
            {detail['Ghi chú'] && <div className="col-span-2"><span className="text-[var(--color-text-muted)]">Ghi chú:</span> {detail['Ghi chú']}</div>}
            {detail['Thông tin học vấn'] && <div className="col-span-2"><span className="text-[var(--color-text-muted)]">Học vấn:</span> {detail['Thông tin học vấn']}</div>}
            {detail['Thông tin gia đình'] && <div className="col-span-2"><span className="text-[var(--color-text-muted)]">Gia đình:</span> {detail['Thông tin gia đình']}</div>}
            <div className="col-span-2 pt-2">
              <Button variant="ghost" onClick={() => openEdit(detail)}>Sửa thông tin</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal thêm/sửa */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa hồ sơ nhân viên' : 'Thêm nhân viên mới'} wide>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Mã NV *" required disabled={!!editing} value={form['Mã NV']} onChange={(e) => setForm({ ...form, 'Mã NV': e.target.value })} placeholder="VD: HH011" />
            <Input label="Họ tên *" required value={form['Họ tên']} onChange={(e) => setForm({ ...form, 'Họ tên': e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Ngày sinh" placeholder="dd/mm/yyyy" value={form['Ngày sinh'] || ''} onChange={(e) => setForm({ ...form, 'Ngày sinh': e.target.value })} />
            <Select label="Giới tính" value={form['Giới tính']} onChange={(e) => setForm({ ...form, 'Giới tính': e.target.value })}>
              <option>Nam</option><option>Nữ</option>
            </Select>
            <Input label="Số CCCD" value={form['Số CCCD'] || ''} onChange={(e) => setForm({ ...form, 'Số CCCD': e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Ngày cấp CCCD" placeholder="dd/mm/yyyy" value={form['Ngày cấp CCCD'] || ''} onChange={(e) => setForm({ ...form, 'Ngày cấp CCCD': e.target.value })} />
            <Input label="Nơi cấp" value={form['Nơi cấp'] || ''} onChange={(e) => setForm({ ...form, 'Nơi cấp': e.target.value })} />
          </div>
          <Textarea label="Địa chỉ thường trú" rows={2} value={form['Địa chỉ thường trú'] || ''} onChange={(e) => setForm({ ...form, 'Địa chỉ thường trú': e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Số điện thoại *" required value={form['Số ĐT']} onChange={(e) => setForm({ ...form, 'Số ĐT': e.target.value })} placeholder="10 số, bắt đầu 0" />
            <Input label="Email" type="email" value={form['Email'] || ''} onChange={(e) => setForm({ ...form, 'Email': e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Khối làm việc" value={form['Khối']} onChange={(e) => setForm({ ...form, 'Khối': e.target.value })}>
              {Object.entries(KHOI_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <Input label="Chức vụ *" required value={form['Chức vụ']} onChange={(e) => setForm({ ...form, 'Chức vụ': e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nơi làm việc / Trạm *" required value={form['Nơi làm việc']} onChange={(e) => setForm({ ...form, 'Nơi làm việc': e.target.value })} />
            <Input label="Ngạch" value={form['Ngạch'] || ''} onChange={(e) => setForm({ ...form, 'Ngạch': e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Ngày vào Cty" type="date" value={form['Ngày vào Cty'] || ''} onChange={(e) => setForm({ ...form, 'Ngày vào Cty': e.target.value })} />
            <Select label="Trạng thái" value={form['Trạng thái']} onChange={(e) => setForm({ ...form, 'Trạng thái': e.target.value })}>
              {Object.entries(TRANG_THAI_NV_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
          <Input label="Quyết định đi kèm" value={form['Quyết định đi kèm'] || ''} onChange={(e) => setForm({ ...form, 'Quyết định đi kèm': e.target.value })} />
          <Textarea label="Ghi chú" rows={2} value={form['Ghi chú'] || ''} onChange={(e) => setForm({ ...form, 'Ghi chú': e.target.value })} />
          <Textarea label="Thông tin học vấn" rows={2} value={form['Thông tin học vấn'] || ''} onChange={(e) => setForm({ ...form, 'Thông tin học vấn': e.target.value })} />
          <Textarea label="Thông tin gia đình" rows={2} value={form['Thông tin gia đình'] || ''} onChange={(e) => setForm({ ...form, 'Thông tin gia đình': e.target.value })} />

          {formError && <ErrorState message={formError} />}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Huỷ</Button>
            <Button type="submit" variant="accent" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu hệ thống'}</Button>
          </div>
        </form>
      </Modal>

      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Nhập nhân viên từ Excel"
        synonyms={NHAN_VIEN_SYNONYMS}
        requiredKeys={NHAN_VIEN_REQUIRED}
        buildRow={buildImportRow}
        onImport={async (rows) => { const r = await importEmployeesFromExcel(rows); load(); return r }}
        resultLabel={(r) => `Đã thêm mới ${r.inserted} nhân viên, cập nhật ${r.updated} nhân viên.${r.errors.length ? ` Có ${r.errors.length} dòng lỗi.` : ''}`}
      />
    </div>
  )
}
