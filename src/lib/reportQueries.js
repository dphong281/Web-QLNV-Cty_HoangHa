import { supabase } from './supabase'
import { decryptValue } from './fernetCrypto'
import { BO_PHAN_OPTIONS } from './danhMuc'
import { parseFlexibleDate } from './format'
import { withCache } from './queryCache'

const CACHE_TTL = 2 * 60 * 1000

function parseDate(v) {
  return parseFlexibleDate(v)
}

// ---------- SINH NHẬT ----------
async function _getBirthdays() {
  const res = await supabase
    .from('nhan_vien')
    .select('"Mã NV", "Họ tên", "Nơi làm việc", "Ngày sinh"')
    .eq('Trạng thái', 'DangLamViec')
  if (res.error) throw res.error

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const curMonth = today.getMonth()
  const curQuarter = Math.floor(curMonth / 3)

  const withBirthday = []
  for (const r of res.data) {
    const birth = parseDate(await decryptValue(r['Ngày sinh']))
    if (!birth) continue
    let snNamNay = new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
    let conLai = Math.round((snNamNay - today) / 86400000)
    if (conLai < 0) {
      snNamNay = new Date(today.getFullYear() + 1, birth.getMonth(), birth.getDate())
      conLai = Math.round((snNamNay - today) / 86400000)
    }
    let tuoi = today.getFullYear() - birth.getFullYear()
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) tuoi--

    withBirthday.push({
      maNv: r['Mã NV'], hoTen: r['Họ tên'], boPhan: r['Nơi làm việc'] || '',
      ngaySinh: r['Ngày sinh'], tuoi, snNamNay, conLai, thang: birth.getMonth(), quy: Math.floor(birth.getMonth() / 3),
    })
  }

  const thangNay = withBirthday.filter((r) => r.thang === curMonth).sort((a, b) => a.conLai - b.conLai)
  const quyNay = withBirthday.filter((r) => r.quy === curQuarter).sort((a, b) => a.conLai - b.conLai)
  return { thangNay, quyNay }
}

// ---------- BÁO CÁO BIẾN ĐỘNG NHÂN SỰ ----------
function tinhTiBLe(nghiViec, dauKy) {
  if (!dauKy) return 0
  return Math.round((nghiViec / dauKy) * 1000) / 10
}

function ghiChu(tyLe) {
  if (tyLe === 0) return 'Ổn định'
  if (tyLe <= 3) return 'Bình thường'
  if (tyLe <= 8) return 'Cần chú ý'
  return 'Biến động cao'
}

async function _getBienDongNhanSu(year = new Date().getFullYear()) {
  const res = await supabase.from('nhan_vien').select('"Mã NV", "Ngày vào Cty", "Ngày nghỉ việc", "Trạng thái"')
  if (res.error) throw res.error

  const rows = res.data
    .map((r) => ({ vao: parseDate(r['Ngày vào Cty']), nghi: parseDate(r['Ngày nghỉ việc']) }))
    .filter((r) => r.vao)

  function dangLamTaiThoiDiem(r, date) {
    return r.vao < date && (!r.nghi || r.nghi >= date)
  }
  function tuyenMoiTrongKy(r, start, end) {
    return r.vao >= start && r.vao < end
  }
  function nghiViecTrongKy(r, start, end) {
    return r.nghi && r.nghi >= start && r.nghi < end
  }

  const monthly = []
  for (let m = 0; m < 12; m++) {
    const start = new Date(year, m, 1)
    const end = new Date(year, m + 1, 1)
    const dauThang = rows.filter((r) => dangLamTaiThoiDiem(r, start)).length
    const tuyenMoi = rows.filter((r) => tuyenMoiTrongKy(r, start, end)).length
    const nghiViec = rows.filter((r) => nghiViecTrongKy(r, start, end)).length
    const cuoiThang = dauThang + tuyenMoi - nghiViec
    const tyLe = tinhTiBLe(nghiViec, dauThang)
    monthly.push({
      thang: m + 1, dauThang, tuyenMoi, nghiViec, bienDongRong: tuyenMoi - nghiViec, cuoiThang, tyLe, ghiChu: ghiChu(tyLe),
    })
  }

  const earliestYear = rows.reduce((min, r) => Math.min(min, r.vao.getFullYear()), year)
  const startYear = Math.max(earliestYear, year - 4)
  const yearly = []
  for (let y = startYear; y <= year; y++) {
    const start = new Date(y, 0, 1)
    const end = new Date(y + 1, 0, 1)
    const dauNam = rows.filter((r) => dangLamTaiThoiDiem(r, start)).length
    const tuyenMoi = rows.filter((r) => tuyenMoiTrongKy(r, start, end)).length
    const nghiViec = rows.filter((r) => nghiViecTrongKy(r, start, end)).length
    const cuoiNam = dauNam + tuyenMoi - nghiViec
    const tyLe = tinhTiBLe(nghiViec, dauNam)
    yearly.push({ nam: y, dauNam, tuyenMoi, nghiViec, bienDongRong: tuyenMoi - nghiViec, cuoiNam, tyLe, binhQuan: Math.round((dauNam + cuoiNam) / 2) })
  }

  const namNay = yearly.find((y) => y.nam === year) || { tuyenMoi: 0, nghiViec: 0 }
  const tongHienTai = rows.filter((r) => !r.nghi).length

  return {
    tongHienTai,
    tuyenMoiNam: namNay.tuyenMoi,
    nghiViecNam: namNay.nghiViec,
    bienDongRong: namNay.tuyenMoi - namNay.nghiViec,
    monthly,
    yearly,
  }
}

// ---------- BÁO CÁO CƠ CẤU NHÂN SỰ THEO BỘ PHẬN ----------
async function _getCoCauBoPhan() {
  const res = await supabase.from('nhan_vien').select('"Nơi làm việc"').eq('Trạng thái', 'DangLamViec')
  if (res.error) throw res.error

  const count = {}
  for (const r of res.data) {
    const bp = r['Nơi làm việc'] || 'Chưa phân bộ phận'
    count[bp] = (count[bp] || 0) + 1
  }

  const tongNhanSuCoBoPhan = res.data.length
  const allBoPhan = [...new Set([...BO_PHAN_OPTIONS, ...Object.keys(count)])]
  const rows = allBoPhan.map((bp) => {
    const soNv = count[bp] || 0
    return {
      boPhan: bp,
      soNv,
      tyTrong: tongNhanSuCoBoPhan ? Math.round((soNv / tongNhanSuCoBoPhan) * 1000) / 10 : 0,
      ghiChu: soNv === 0 ? 'Chưa có nhân sự' : null,
    }
  }).sort((a, b) => b.soNv - a.soNv)

  return {
    rows,
    tongBoPhanCoNhanSu: rows.filter((r) => r.soNv > 0).length,
    tongNhanSuCoBoPhan,
    boPhanTrongDanhMuc: BO_PHAN_OPTIONS.length,
  }
}

export const getBirthdays = withCache('birthdays', CACHE_TTL, _getBirthdays)
export const getBienDongNhanSu = withCache('bienDongNhanSu', CACHE_TTL, _getBienDongNhanSu)
export const getCoCauBoPhan = withCache('coCauBoPhan', CACHE_TTL, _getCoCauBoPhan)
