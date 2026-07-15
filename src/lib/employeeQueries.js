import { supabase } from './supabase'
import { encryptValue, decryptValue } from './fernetCrypto'

// ---------- KHOÁ ĐỒNG THỜI (optimistic lock) ----------
export class ConflictError extends Error {
  constructor() {
    super('Dữ liệu này đã bị người khác thay đổi kể từ khi bạn mở form. Vui lòng tải lại rồi thử lại.')
    this.name = 'ConflictError'
  }
}

const COLUMNS = '"Mã NV", "Họ tên", "Ngày sinh", "Giới tính", "Số CCCD", "Ngày cấp CCCD", "Nơi cấp", "Mã số thuế", "Số BHXH", "Tình trạng hôn nhân", "Quốc tịch", "Địa chỉ thường trú", "Địa chỉ hiện tại", "Số ĐT", "Email", "Email công ty", "Người liên hệ khẩn cấp", "SĐT khẩn cấp", "Khối", "Chức vụ", "Cấp bậc", "Nơi làm việc", "Ngạch", "Quản lý trực tiếp", "Ngày vào Cty", "Ngày nghỉ việc", "Trạng thái", "Quyết định đi kèm", "Số người phụ thuộc", "Số tài khoản", "Ngân hàng", "Trình độ", "Chuyên ngành", "Hồ sơ giấy tờ", "Ghi chú", "Ghi chú nghỉ hưu", "Thông tin học vấn", "Thông tin gia đình", updated_at'

// Các trường nhạy cảm được mã hoá Fernet ở tầng ứng dụng trước khi ghi xuống DB.
const ENCRYPTED_FIELDS = ['Số ĐT', 'Mã số thuế', 'Số BHXH', 'Số tài khoản']

async function decryptEmployee(e) {
  const result = { ...e }
  for (const f of ENCRYPTED_FIELDS) result[f] = await decryptValue(e[f])
  return result
}

export async function getAllEmployees({ khoi, chucVu, noiLamViec, trangThai, keyword } = {}) {
  let query = supabase.from('nhan_vien').select(COLUMNS)
  if (khoi) query = query.eq('Khối', khoi)
  if (chucVu) query = query.eq('Chức vụ', chucVu)
  if (noiLamViec) query = query.eq('Nơi làm việc', noiLamViec)
  if (trangThai) query = query.eq('Trạng thái', trangThai)
  const res = await query.order('Mã NV')
  if (res.error) throw res.error

  let employees = await Promise.all(res.data.map(decryptEmployee))

  if (keyword) {
    const kw = keyword.trim().toLowerCase()
    employees = employees.filter(
      (e) =>
        String(e['Mã NV'] || '').toLowerCase().includes(kw) ||
        String(e['Họ tên'] || '').toLowerCase().includes(kw) ||
        String(e['Số ĐT'] || '').toLowerCase().includes(kw)
    )
  }
  return employees
}

export async function getEmployeeByMa(maNv) {
  const res = await supabase.from('nhan_vien').select(COLUMNS).eq('Mã NV', maNv).limit(1)
  if (res.error) throw res.error
  if (!res.data.length) return null
  return decryptEmployee(res.data[0])
}

export async function createEmployee(data) {
  const payload = { ...data }
  for (const f of ENCRYPTED_FIELDS) if (f in payload) payload[f] = await encryptValue(payload[f])
  const res = await supabase.from('nhan_vien').insert(payload).select().single()
  if (res.error) throw res.error
  return decryptEmployee(res.data)
}

export async function updateEmployee(maNv, data, expectedUpdatedAt) {
  const payload = { ...data }
  for (const f of ENCRYPTED_FIELDS) if (f in payload) payload[f] = await encryptValue(payload[f])
  let query = supabase.from('nhan_vien').update(payload).eq('Mã NV', maNv)
  if (expectedUpdatedAt) query = query.eq('updated_at', expectedUpdatedAt)
  const res = await query.select().maybeSingle()
  if (res.error) throw res.error
  if (!res.data && expectedUpdatedAt) throw new ConflictError()
  return res.data ? decryptEmployee(res.data) : res.data
}

// Không xoá cứng — chỉ chuyển trạng thái, giống hệt bản desktop
export async function deactivateEmployee(maNv) {
  return updateEmployee(maNv, { 'Trạng thái': 'DaNghiViec' })
}

export async function getDistinctNoiLamViec() {
  const res = await supabase.from('nhan_vien').select('"Nơi làm việc"')
  if (res.error) throw res.error
  return [...new Set(res.data.map((r) => r['Nơi làm việc']).filter(Boolean))].sort()
}

// ---------- NHẬP/XUẤT EXCEL HÀNG LOẠT ----------
export async function importEmployeesFromExcel(rows) {
  const result = { inserted: 0, updated: 0, errors: [] }
  let existingCodes
  try {
    const existing = await getAllEmployees()
    existingCodes = new Set(existing.map((e) => e['Mã NV']))
  } catch (err) {
    result.errors.push(['(tải danh sách hiện có)', err.message])
    return result
  }

  for (const row of rows) {
    const maNv = String(row['Mã NV'] || '').trim().toUpperCase()
    if (!maNv) continue
    const isEdit = existingCodes.has(maNv)
    try {
      if (isEdit) {
        const { 'Mã NV': _omit, ...rest } = { ...row, 'Mã NV': maNv }
        await updateEmployee(maNv, rest)
        result.updated += 1
      } else {
        await createEmployee({ ...row, 'Mã NV': maNv })
        result.inserted += 1
        existingCodes.add(maNv)
      }
    } catch (err) {
      result.errors.push([maNv, err.message])
    }
  }
  return result
}
