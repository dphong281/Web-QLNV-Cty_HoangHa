import { useEffect, useState } from 'react'
import {
  getAllEmployees, createEmployee, updateEmployee, deactivateEmployee, importEmployeesFromExcel, ConflictError,
} from '../lib/employeeQueries'
import { KHOI_LABELS, TRANG_THAI_NV_LABELS, TRANG_THAI_NV_COLORS } from '../lib/format'
import { NHAN_VIEN_SYNONYMS, NHAN_VIEN_REQUIRED, NHAN_VIEN_HEADERS } from '../lib/importSynonyms'
import { cellValue, cellDateToIso, exportToExcel } from '../lib/excelImport'
import { getRetirementWarning } from '../lib/retirement'
import { computeHoSoCompletion, completionColor } from '../lib/hoSoChecklist'
import ExcelImportModal from '../components/ExcelImportModal'
import NhanVienFormModal from '../components/NhanVienFormModal'
import NhanVienDetailModal from '../components/NhanVienDetailModal'
import { Card, Button, Badge, LoadingState, ErrorState, EmptyState } from '../components/ui'

const KHOI_LABEL_TO_CODE = Object.fromEntries(Object.entries(KHOI_LABELS).map(([k, v]) => [v, k]))
const TRANG_THAI_LABEL_TO_CODE = Object.fromEntries(Object.entries(TRANG_THAI_NV_LABELS).map(([k, v]) => [v, k]))

// Các trường không phải chuỗi text đơn giản — xử lý riêng khi nhập Excel.
const DATE_FIELDS = ['Ngày vào Cty', 'Ngày nghỉ việc']
const NUMBER_FIELDS = ['Số người phụ thuộc']

const EMPTY_FORM = {
  'Mã NV': '', 'Họ tên': '', 'Ngày sinh': '', 'Giới tính': 'Nam', 'Số CCCD': '',
  'Ngày cấp CCCD': '', 'Nơi cấp': '', 'Mã số thuế': '', 'Số BHXH': '', 'Tình trạng hôn nhân': '',
  'Quốc tịch': 'Việt Nam', 'Địa chỉ thường trú': '', 'Địa chỉ hiện tại': '',
  'Số ĐT': '', 'Email': '', 'Email công ty': '', 'Người liên hệ khẩn cấp': '', 'SĐT khẩn cấp': '',
  'Khối': 'VanPhong', 'Chức vụ': '', 'Cấp bậc': '', 'Nơi làm việc': '', 'Ngạch': '', 'Quản lý trực tiếp': '',
  'Ngày vào Cty': '', 'Ngày nghỉ việc': '', 'Trạng thái': 'DangLamViec', 'Quyết định đi kèm': '',
  'Số người phụ thuộc': 0, 'Số tài khoản': '', 'Ngân hàng': '', 'Trình độ': '', 'Chuyên ngành': '',
  'Hồ sơ giấy tờ': {}, 'Ghi chú': '', 'Ghi chú nghỉ hưu': '',
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
    setForm({ ...EMPTY_FORM, ...emp, 'Hồ sơ giấy tờ': emp['Hồ sơ giấy tờ'] || {} })
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
        const { 'Mã NV': _omit, updated_at: expectedUpdatedAt, ...rest } = payload
        await updateEmployee(editing['Mã NV'], rest, expectedUpdatedAt)
      } else {
        await createEmployee(payload)
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
      if (h === 'Mã NV' || DATE_FIELDS.includes(h)) continue
      const raw = String(cellValue(row, colMap, h, '')).trim()
      data[h] = NUMBER_FIELDS.includes(h) ? (Number(raw) || 0) : raw
    }
    data['Giới tính'] = data['Giới tính'] || 'Nam'
    data['Khối'] = KHOI_LABEL_TO_CODE[data['Khối']] || data['Khối'] || 'VanPhong'
    data['Trạng thái'] = TRANG_THAI_LABEL_TO_CODE[data['Trạng thái']] || data['Trạng thái'] || 'DangLamViec'
    for (const h of DATE_FIELDS) data[h] = cellDateToIso(row, colMap, h) || null
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
                <th className="px-5 py-3 font-medium">Hồ sơ</th>
                <th className="px-5 py-3 font-medium">Trạng thái</th>
                <th className="px-5 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => {
                const { done, total, percent } = computeHoSoCompletion(emp['Hồ sơ giấy tờ'])
                const warning = getRetirementWarning(emp['Ngày sinh'], emp['Giới tính'])
                return (
                  <tr key={emp['Mã NV']} className="border-b border-[var(--color-line)] last:border-0 hover:bg-black/[0.015]">
                    <td className="px-5 py-3 font-medium text-[var(--color-ink)]">
                      <button onClick={() => setDetail(emp)} className="hover:underline">{emp['Mã NV']}</button>
                    </td>
                    <td className="px-5 py-3">
                      {emp['Họ tên']}
                      {warning && <span title={warning.text} className="ml-1.5 text-xs">⚠</span>}
                    </td>
                    <td className="px-5 py-3 text-[var(--color-text-muted)]">{KHOI_LABELS[emp['Khối']] || emp['Khối']}</td>
                    <td className="px-5 py-3 text-[var(--color-text-muted)]">{emp['Chức vụ']}</td>
                    <td className="px-5 py-3 text-[var(--color-text-muted)]">{emp['Nơi làm việc']}</td>
                    <td className="px-5 py-3">
                      <Badge className={completionColor(percent)}>{done}/{total}</Badge>
                    </td>
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
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      <NhanVienDetailModal detail={detail} onClose={() => setDetail(null)} onEdit={openEdit} />

      <NhanVienFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        form={form}
        setForm={setForm}
        onSubmit={handleSave}
        saving={saving}
        formError={formError}
      />

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
