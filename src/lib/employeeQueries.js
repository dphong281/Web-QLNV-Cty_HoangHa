import { supabase } from './supabase'
import { encryptValue, decryptValue } from './fernetCrypto'

// ---------- KHOÁ ĐỒNG THỜI (optimistic lock) ----------
export class ConflictError extends Error {
  constructor() {
    super('Dữ liệu này đã bị người khác thay đổi kể từ khi bạn mở form. Vui lòng tải lại rồi thử lại.')
    this.name = 'ConflictError'
  }
}

const COLUMNS = '"Mã NV", "Họ tên", "Ngày sinh", "Giới tính", "Số CCCD", "Ngày cấp CCCD", "Nơi cấp", "Địa chỉ thường trú", "Số ĐT", "Email", "Khối", "Chức vụ", "Nơi làm việc", "Ngạch", "Ngày vào Cty", "Trạng thái", "Quyết định đi kèm", "Ghi chú", "Thông tin học vấn", "Thông tin gia đình", updated_at'

export async function getAllEmployees({ khoi, chucVu, noiLamViec, trangThai, keyword } = {}) {
  let query = supabase.from('nhan_vien').select(COLUMNS)
  if (khoi) query = query.eq('Khối', khoi)
  if (chucVu) query = query.eq('Chức vụ', chucVu)
  if (noiLamViec) query = query.eq('Nơi làm việc', noiLamViec)
  if (trangThai) query = query.eq('Trạng thái', trangThai)
  const res = await query.order('Mã NV')
  if (res.error) throw res.error

  let employees = await Promise.all(
    res.data.map(async (e) => ({ ...e, 'Số ĐT': await decryptValue(e['Số ĐT']) }))
  )

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
  const emp = res.data[0]
  emp['Số ĐT'] = await decryptValue(emp['Số ĐT'])
  return emp
}

export async function createEmployee(data) {
  const payload = { ...data }
  if ('Số ĐT' in payload) payload['Số ĐT'] = await encryptValue(payload['Số ĐT'])
  const res = await supabase.from('nhan_vien').insert(payload).select().single()
  if (res.error) throw res.error
  return res.data
}

export async function updateEmployee(maNv, data, expectedUpdatedAt) {
  const payload = { ...data }
  if ('Số ĐT' in payload) payload['Số ĐT'] = await encryptValue(payload['Số ĐT'])
  let query = supabase.from('nhan_vien').update(payload).eq('Mã NV', maNv)
  if (expectedUpdatedAt) query = query.eq('updated_at', expectedUpdatedAt)
  const res = await query.select().maybeSingle()
  if (res.error) throw res.error
  if (!res.data && expectedUpdatedAt) throw new ConflictError()
  if (res.data) res.data['Số ĐT'] = await decryptValue(res.data['Số ĐT'])
  return res.data
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
