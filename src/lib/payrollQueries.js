import { supabase } from './supabase'
import { encryptValue, decryptValue } from './fernetCrypto'

const NIGHT_SHIFT_CA_ID_FALLBACK = 3
// Các khoản lương/phụ cấp chi tiết theo đúng cột trong file Excel công ty (ho_so_luong).
// phu_cap_co_dinh giữ lại cho tương thích ngược, không dùng để tính "Tổng phụ cấp" nữa.
const ALLOWANCE_FIELDS_BHXH = [
  'phu_cap_chuc_danh', 'phu_cap_trach_nhiem_luong', 'phu_cap_doc_hai_luong', 'phu_cap_tham_nien',
  'phu_cap_thu_hut', 'phu_cap_vung', 'phu_cap_kiem_nhiem', 'luong_kpi',
]
const ALLOWANCE_FIELDS_KHONG_BHXH = [
  'phu_cap_xang_xe', 'phu_cap_dien_thoai', 'phu_cap_nha_o', 'phu_cap_an_ca', 'phu_cap_dong_phuc', 'phuc_loi_con_nho',
]
const ALLOWANCE_FIELDS = [...ALLOWANCE_FIELDS_BHXH, ...ALLOWANCE_FIELDS_KHONG_BHXH]
const MONEY_FIELDS = [
  'luong_co_ban', 'phu_cap_co_dinh', 'don_gia_ca_dem', 'don_gia_ot_gio', 'don_gia_chuyen', 'muc_phat_vang_mat',
  ...ALLOWANCE_FIELDS,
]

export function tinhTongPhuCap(hs) {
  return ALLOWANCE_FIELDS.reduce((sum, f) => sum + (Number(hs?.[f]) || 0), 0)
}
export function tinhTongThuNhap(hs) {
  return (Number(hs?.luong_co_ban) || 0) + tinhTongPhuCap(hs)
}

function lastDayOfMonth(year, month) { return new Date(year, month, 0).getDate() }

export async function getActiveEmployeesBasic() {
  // Tính lương cho tất cả nhân viên TRỪ Tạm nghỉ/Nghỉ thai sản/Đã nghỉ việc — dùng cách loại
  // trừ thay vì chỉ liệt kê "DangLamViec"/"ThuViec" để không bị sót người có Trạng thái ghi
  // lệch chữ khi nhập Excel (VD "Đang thử việc" thay vì "Thử việc") không khớp đúng 2 mã đó.
  const res = await supabase.from('nhan_vien').select('"Mã NV", "Họ tên", "Khối"').not('Trạng thái', 'in', '(TamNghi,NghiThaiSan,DaNghiViec)').order('Mã NV')
  if (res.error) throw res.error
  return res.data
}

// Giống getActiveEmployeesBasic nhưng kèm luôn Lương cơ bản/Tổng phụ cấp đã khai báo sẵn ở
// "Đơn giá lương" (ho_so_luong) — dùng cho bảng "xem trước" khi CHƯA bấm Tính lương, để không
// hiện trống trơn dù đơn giá đã có sẵn từ trước.
export async function getActiveEmployeesWithRate() {
  const [empRes, hsRes] = await Promise.all([
    supabase.from('nhan_vien').select('"Mã NV", "Họ tên", "Khối"').not('Trạng thái', 'in', '(TamNghi,NghiThaiSan,DaNghiViec)').order('Mã NV'),
    supabase.from('ho_so_luong').select('*'),
  ])
  if (empRes.error) throw empRes.error
  if (hsRes.error) throw hsRes.error

  const hoSoMap = {}
  for (const h of hsRes.data) {
    const row = {}
    for (const f of MONEY_FIELDS) row[f] = Number(await decryptValue(h[f])) || 0
    hoSoMap[h.ma_nv] = row
  }

  return empRes.data.map((e) => {
    const hs = hoSoMap[e['Mã NV']]
    return {
      ...e,
      luongCoBan: hs ? hs.luong_co_ban : null,
      phuCap: hs ? tinhTongPhuCap(hs) : null,
    }
  })
}

export async function getOrCreatePeriod(month, year) {
  const res = await supabase.from('ky_luong').select('*').eq('thang', month).eq('nam', year).limit(1)
  if (res.error) throw res.error
  if (res.data.length) return res.data[0]
  const insertRes = await supabase.from('ky_luong').insert({ thang: month, nam: year }).select().single()
  if (insertRes.error) throw insertRes.error
  return insertRes.data
}

export async function closePeriod(periodId, userId) {
  const res = await supabase.from('ky_luong').update({
    trang_thai: 'DaChot', ngay_chot: new Date().toISOString(), nguoi_chot: userId,
  }).eq('id', periodId)
  if (res.error) throw res.error
}

export async function getHoSoLuong(maNv) {
  const res = await supabase.from('ho_so_luong').select('*').eq('ma_nv', maNv).limit(1)
  if (res.error) throw res.error
  if (!res.data.length) return null
  const hs = res.data[0]
  for (const f of MONEY_FIELDS) hs[f] = Number(await decryptValue(hs[f])) || 0
  return hs
}

export async function upsertHoSoLuong(maNv, data) {
  const payload = { ma_nv: maNv }
  for (const f of MONEY_FIELDS) {
    if (f in data) payload[f] = await encryptValue(data[f])
  }
  const res = await supabase.from('ho_so_luong').upsert(payload, { onConflict: 'ma_nv' })
  if (res.error) throw res.error
}

export async function generatePayroll(month, year) {
  const period = await getOrCreatePeriod(month, year)
  const periodId = period.id

  const dayStart = `${year}-${String(month).padStart(2, '0')}-01`
  const dayEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth(year, month)).padStart(2, '0')}`

  const empRes = await supabase.from('nhan_vien').select('"Mã NV"').not('Trạng thái', 'in', '(TamNghi,NghiThaiSan,DaNghiViec)')
  if (empRes.error) throw empRes.error
  const maNvList = empRes.data.map((e) => e['Mã NV'])
  if (!maNvList.length) return { count: 0, periodId }

  const hsRes = await supabase.from('ho_so_luong').select('*').in('ma_nv', maNvList)
  if (hsRes.error) throw hsRes.error
  const hoSoMap = {}
  for (const h of hsRes.data) {
    hoSoMap[h.ma_nv] = {}
    for (const f of MONEY_FIELDS) hoSoMap[h.ma_nv][f] = Number(await decryptValue(h[f])) || 0
  }

  const caRes = await supabase.from('loai_ca').select('id, is_night')
  const nightCaIds = caRes.data?.filter((c) => c.is_night).map((c) => c.id) || [NIGHT_SHIFT_CA_ID_FALLBACK]

  const shiftsRes = await supabase.from('lich_lam_viec').select('ma_nv, ngay_lam, id_ca')
    .in('id_ca', nightCaIds).gte('ngay_lam', dayStart).lte('ngay_lam', dayEnd).in('ma_nv', maNvList)
  if (shiftsRes.error) throw shiftsRes.error
  const nightShiftCount = {}
  for (const s of shiftsRes.data) nightShiftCount[s.ma_nv] = (nightShiftCount[s.ma_nv] || 0) + 1

  const ccRes = await supabase.from('cham_cong').select('ma_nv, trang_thai, ot_gio')
    .gte('ngay', dayStart).lte('ngay', dayEnd).in('ma_nv', maNvList)
  if (ccRes.error) throw ccRes.error
  const otHoursByNv = {}
  const absentCount = {}
  for (const r of ccRes.data) {
    otHoursByNv[r.ma_nv] = (otHoursByNv[r.ma_nv] || 0) + (r.ot_gio || 0)
    if (r.trang_thai === 'TuYBoCa') absentCount[r.ma_nv] = (absentCount[r.ma_nv] || 0) + 1
  }

  const shipRes = await supabase.from('chuyen_hang').select('ma_nv, ngay_ve, trang_thai')
    .eq('trang_thai', 'HoanThanh').gte('ngay_ve', dayStart).lte('ngay_ve', `${dayEnd}T23:59:59`).in('ma_nv', maNvList)
  if (shipRes.error) throw shipRes.error
  const shipmentCount = {}
  for (const s of shipRes.data) if (s.ma_nv) shipmentCount[s.ma_nv] = (shipmentCount[s.ma_nv] || 0) + 1

  const rows = []
  for (const maNv of maNvList) {
    const hs = hoSoMap[maNv] || {}
    const luongCoBan = hs.luong_co_ban || 0
    const phuCap = tinhTongPhuCap(hs)
    const donGiaCaDem = hs.don_gia_ca_dem || 0
    const donGiaOt = hs.don_gia_ot_gio || 0
    const donGiaChuyen = hs.don_gia_chuyen || 0
    const mucPhat = hs.muc_phat_vang_mat || 0

    const luongCaDem = (nightShiftCount[maNv] || 0) * donGiaCaDem
    const luongOt = (otHoursByNv[maNv] || 0) * donGiaOt
    const luongChuyen = (shipmentCount[maNv] || 0) * donGiaChuyen
    const khauTru = (absentCount[maNv] || 0) * mucPhat
    const thucLanh = luongCoBan + phuCap + luongCaDem + luongOt + luongChuyen - khauTru

    const row = {
      id_ky_luong: periodId, ma_nv: maNv,
      luong_co_ban: await encryptValue(luongCoBan),
      phu_cap: await encryptValue(phuCap),
      luong_ca_dem: await encryptValue(luongCaDem),
      luong_ot: await encryptValue(luongOt),
      luong_chuyen: await encryptValue(luongChuyen),
      khau_tru: await encryptValue(khauTru),
      thuc_lanh: await encryptValue(thucLanh),
    }
    // Chụp lại từng khoản phụ cấp chi tiết tại thời điểm tính lương này (không đổi theo
    // nếu sau đó sửa đơn giá hiện tại của nhân viên ở ho_so_luong).
    for (const f of ALLOWANCE_FIELDS) row[f] = await encryptValue(hs[f] || 0)
    rows.push(row)
  }

  const upsertRes = await supabase.from('bang_luong').upsert(rows, { onConflict: 'id_ky_luong,ma_nv' })
  if (upsertRes.error) throw upsertRes.error
  return { count: rows.length, periodId }
}

export async function getPayrollTable(periodId) {
  const res = await supabase.from('bang_luong').select('*').eq('id_ky_luong', periodId)
  if (res.error) throw res.error
  if (!res.data.length) return []

  const maNvList = [...new Set(res.data.map((r) => r.ma_nv))]
  const empRes = await supabase.from('nhan_vien').select('"Mã NV", "Họ tên", "Khối"').in('Mã NV', maNvList)
  if (empRes.error) throw empRes.error
  const empMap = Object.fromEntries(empRes.data.map((e) => [e['Mã NV'], e]))

  const result = await Promise.all(res.data.map(async (r) => {
    const emp = empMap[r.ma_nv] || {}
    const row = {
      payrollId: r.id, maNv: r.ma_nv, hoTen: emp['Họ tên'] || '', khoi: emp['Khối'] || '',
      luongCoBan: Number(await decryptValue(r.luong_co_ban)) || 0,
      phuCap: Number(await decryptValue(r.phu_cap)) || 0,
      luongCaDem: Number(await decryptValue(r.luong_ca_dem)) || 0,
      luongOt: Number(await decryptValue(r.luong_ot)) || 0,
      luongChuyen: Number(await decryptValue(r.luong_chuyen)) || 0,
      khauTru: Number(await decryptValue(r.khau_tru)) || 0,
      thucLanh: Number(await decryptValue(r.thuc_lanh)) || 0,
    }
    for (const f of ALLOWANCE_FIELDS) row[f] = Number(await decryptValue(r[f])) || 0
    return row
  }))
  result.sort((a, b) => a.maNv.localeCompare(b.maNv))
  return result
}
