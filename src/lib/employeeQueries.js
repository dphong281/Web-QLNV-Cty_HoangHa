import { supabase } from './supabase'
import { encryptValue, decryptValue } from './fernetCrypto'

// ---------- KHOÁ ĐỒNG THỜI (optimistic lock) ----------
// Mã hoá lại TOÀN BỘ nhân viên hiện có — dùng 1 lần sau khi mở rộng danh sách trường mã hoá,
// để dữ liệu cũ (đang ở dạng chữ thường) được mã hoá theo chuẩn mới. An toàn để chạy nhiều lần:
// decryptValue() tự nhận biết dữ liệu chưa mã hoá và trả nguyên văn, nên đọc-rồi-ghi-lại
// không làm mất dữ liệu, chỉ đổi từ dạng chữ thường sang dạng đã mã hoá.
export async function reencryptAllEmployees(onProgress) {
  const res = await supabase.from('nhan_vien').select(COLUMNS)
  if (res.error) throw res.error
  const total = res.data.length
  let done = 0
  for (const raw of res.data) {
    const emp = await decryptEmployee(raw)
    const payload = {}
    for (const f of ENCRYPTED_FIELDS) payload[f] = emp[f]
    const upd = await supabase.from('nhan_vien').update(await encryptPayload(payload)).eq('Mã NV', emp['Mã NV'])
    if (upd.error) throw new Error(`${emp['Mã NV']}: ${upd.error.message}`)
    done += 1
    if (onProgress) onProgress(done, total)
  }
  return { total }
}

async function encryptPayload(payload) {
  const out = {}
  for (const [k, v] of Object.entries(payload)) out[k] = await encryptValue(v)
  return out
}


export class ConflictError extends Error {
  constructor() {
    super('Dữ liệu này đã bị người khác thay đổi kể từ khi bạn mở form. Vui lòng tải lại rồi thử lại.')
    this.name = 'ConflictError'
  }
}

const COLUMNS = '"Mã NV", "Họ tên", "Ngày sinh", "Giới tính", "Số CCCD", "Ngày cấp CCCD", "Nơi cấp", "Mã số thuế", "Số BHXH", "Tình trạng hôn nhân", "Quốc tịch", "Địa chỉ thường trú", "Địa chỉ hiện tại", "Số ĐT", "Email", "Email công ty", "Người liên hệ khẩn cấp", "SĐT khẩn cấp", "Khối", "Chức vụ", "Cấp bậc", "Nơi làm việc", "Ngạch", "Quản lý trực tiếp", "Ngày vào Cty", "Ngày nghỉ việc", "Trạng thái", "Quyết định đi kèm", "Số người phụ thuộc", "Số tài khoản", "Ngân hàng", "Trình độ", "Chuyên ngành", "Hồ sơ giấy tờ", "Ghi chú", "Ghi chú nghỉ hưu", "Thông tin học vấn", "Thông tin gia đình", updated_at'

// Mã hoá TOÀN BỘ thông tin cá nhân — chỉ chừa lại các trường cần cho tìm kiếm/lọc:
// Mã NV, Họ tên, Khối, Nơi làm việc, Trạng thái (+ updated_at cho khoá đồng thời).
// Ghi chú: "Ngày vào Cty"/"Ngày nghỉ việc" (cột kiểu date) và "Số người phụ thuộc" (kiểu số)
// và "Hồ sơ giấy tờ" (kiểu jsonb) CHƯA mã hoá được vì cần đổi kiểu cột trước — xem ghi chú cuối file.
const ENCRYPTED_FIELDS = [
  'Ngày sinh', 'Giới tính', 'Số CCCD', 'Ngày cấp CCCD', 'Nơi cấp',
  'Mã số thuế', 'Số BHXH', 'Tình trạng hôn nhân', 'Quốc tịch',
  'Địa chỉ thường trú', 'Địa chỉ hiện tại',
  'Số ĐT', 'Email', 'Email công ty', 'Người liên hệ khẩn cấp', 'SĐT khẩn cấp',
  'Chức vụ', 'Cấp bậc', 'Ngạch', 'Quản lý trực tiếp', 'Quyết định đi kèm',
  'Số tài khoản', 'Ngân hàng', 'Trình độ', 'Chuyên ngành',
  'Ghi chú', 'Ghi chú nghỉ hưu', 'Thông tin học vấn', 'Thông tin gia đình',
]

async function decryptEmployee(e) {
  const result = { ...e }
  await Promise.all(ENCRYPTED_FIELDS.map(async (f) => { result[f] = await decryptValue(e[f]) }))
  return result
}

// Trường mã hoá thực sự cần cho DANH SÁCH Nhân sự (tìm kiếm theo SĐT + hiển thị cột Chức vụ) —
// dùng cho trang danh sách thay vì giải mã hết 28 trường như getAllEmployees, giảm hẳn khối
// lượng giải mã mỗi lần tải trang (chi tiết đầy đủ chỉ giải mã khi bấm xem 1 người, qua
// getEmployeeByMa).
const LIST_FIELDS = ['Chức vụ', 'Số ĐT']

async function decryptEmployeeForList(e) {
  const result = { ...e }
  await Promise.all(LIST_FIELDS.map(async (f) => { result[f] = await decryptValue(e[f]) }))
  return result
}

export async function getAllEmployeesList() {
  const res = await supabase.from('nhan_vien').select(COLUMNS).order('Mã NV')
  if (res.error) throw res.error
  return Promise.all(res.data.map(decryptEmployeeForList))
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
