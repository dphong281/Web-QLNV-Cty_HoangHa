import { useEffect, useState } from 'react'
import { Modal, Input, Select, Button, ErrorState } from './ui'
import { getEmployeeByMa } from '../lib/employeeQueries'
import {
  PRINT_TEMPLATES, getTemplateKey, buildDocxValues, prefillFromEmployee, generateAndDownloadContract,
} from '../lib/contractPrint'

const LOAI_VAN_BAN_OPTIONS = [
  { value: 'ThuViec', label: 'Hợp đồng thử việc' },
  { value: 'HopDongLaoDong', label: 'Hợp đồng lao động' },
  { value: 'QuyetDinhThuViec', label: 'Quyết định tiếp nhận thử việc' },
]

const KHOI_OPTIONS = [
  { value: 'VanPhong', label: 'Văn phòng' },
  { value: 'CayXang', label: 'Cửa hàng xăng dầu' },
  { value: 'TaiXe', label: 'Tàu' },
]

// props:
// - open, onClose
// - initialMaNv: mã NV để tự tải + điền sẵn thông tin (tuỳ chọn)
// - initialLoaiVanBan: 'ThuViec' | 'HopDongLaoDong' | 'QuyetDinhThuViec' (tuỳ chọn)
// - contract: bản ghi hop_dong hiện có để điền sẵn số HĐ/lương/ngày (tuỳ chọn)
export default function PrintContractModal({ open, onClose, initialMaNv, initialLoaiVanBan, contract }) {
  const [maNv, setMaNv] = useState(initialMaNv || '')
  const [loaiVanBan, setLoaiVanBan] = useState(initialLoaiVanBan || 'ThuViec')
  const [khoi, setKhoi] = useState('VanPhong')
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  const templateKey = getTemplateKey(loaiVanBan, khoi)
  const config = PRINT_TEMPLATES[templateKey]

  useEffect(() => {
    if (!open) return
    setMaNv(initialMaNv || '')
    setLoaiVanBan(initialLoaiVanBan || 'ThuViec')
    setError(null)
    if (initialMaNv) loadEmployee(initialMaNv)
    else setValues({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMaNv, initialLoaiVanBan])

  async function loadEmployee(code) {
    setLoading(true)
    setError(null)
    try {
      const emp = await getEmployeeByMa(code.trim().toUpperCase())
      if (!emp) {
        setError(`Không tìm thấy nhân viên mã '${code}'.`)
        return
      }
      if (emp['Khối']) setKhoi(emp['Khối'])
      const prefilled = await prefillFromEmployee(emp, contract)
      setValues((v) => ({ ...v, ...prefilled }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleMaNvBlur() {
    if (maNv.trim()) loadEmployee(maNv)
  }

  function setField(key, val) {
    setValues((v) => ({ ...v, [key]: val }))
  }

  async function handleGenerate(e) {
    e.preventDefault()
    setGenerating(true)
    setError(null)
    try {
      const docxValues = buildDocxValues(config.fields, values)
      const fileName = `${config.label.replace(/\s+/g, '_')}_${values.HoTen || maNv || 'NV'}.docx`
      await generateAndDownloadContract(templateKey, docxValues, fileName)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="In hợp đồng / quyết định" size="xl">
      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Input label="Mã nhân viên" value={maNv} onChange={(e) => setMaNv(e.target.value)} onBlur={handleMaNvBlur} placeholder="VD: HH011" />
          <Select label="Loại văn bản" value={loaiVanBan} onChange={(e) => setLoaiVanBan(e.target.value)}>
            {LOAI_VAN_BAN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Select label="Khối" value={khoi} onChange={(e) => setKhoi(e.target.value)}>
            {KHOI_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>

        {loading && <div className="text-sm text-[var(--color-text-muted)]">Đang tải thông tin nhân viên...</div>}

        <div className="rounded-lg bg-black/[0.02] border border-[var(--color-line)] px-4 py-2.5 text-xs text-[var(--color-text-muted)]">
          Mẫu đang dùng: <b>{config.label}</b>. Các trường bên dưới điền sẵn từ hồ sơ nhân viên (nếu có) — anh có thể sửa trước khi tải file.
        </div>

        <div className="grid grid-cols-2 gap-4">
          {config.fields.map((f) => (
            <Input
              key={f.key}
              label={f.label}
              type={f.type === 'date' ? 'date' : f.type === 'currency' ? 'number' : 'text'}
              value={values[f.key] || ''}
              onChange={(e) => setField(f.key, e.target.value)}
              placeholder={f.placeholder}
            />
          ))}
        </div>

        {error && <ErrorState message={error} />}

        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-line)]">
          <Button type="button" variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button type="submit" variant="accent" disabled={generating}>{generating ? 'Đang tạo file...' : '⬇ Tải file Word'}</Button>
        </div>
      </form>
    </Modal>
  )
}
