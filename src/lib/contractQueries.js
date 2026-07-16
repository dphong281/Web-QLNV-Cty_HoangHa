import { supabase } from './supabase'
import { encryptValue, decryptValue } from './fernetCrypto'
import { getEmployeeByMa } from './employeeQueries'

const NGUONG_SAP_HET_HAN_NGAY = 30
const SO_LAN_TOI_DA_XDTH = 2
const MONEY_FIELDS = ['luong_co_ban', 'phu_cap_doc_hai', 'phu_cap_trach_nhiem']

export function computeDisplayStatus(contract) {
  if (contract.trang_thai === 'DaThanhLy') return 'DaThanhLy'
  if (!contract.ngay_het_han) return 'DangHieuLuc'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const hetHan = new Date(contract.ngay_het_han); hetHan.setHours(0, 0, 0, 0)
  const soNgay = Math.round((hetHan - today) / 86400000)
  if (soNgay < 0) return 'DaHetHan'
  if (soNgay <= NGUONG_SAP_HET_HAN_NGAY) return 'SapHetHan'
  return 'DangHieuLuc'
}

export function getLoaiHdDisplay(loaiHd, lanThu) {
  const LABELS = { ThuViec: 'Thử việc', XacDinhThoiHan: 'Xác định thời hạn', KhongXacDinhThoiHan: 'Không xác định thời hạn' }
  if (loaiHd === 'XacDinhThoiHan' && lanThu) return `Xác định thời hạn - Lần ${lanThu}`
  return LABELS[loaiHd] || loaiHd
}

async function decryptContract(c) {
  const result = { ...c }
  for (const f of MONEY_FIELDS) result[f] = await decryptValue(c[f]).then((v) => Number(v) || 0)
  return result
}

// Sinh "Mã HĐ hệ thống" theo kiểu A1, A2, ... A99, B1, B2, ... B99, C1, ... — mỗi chữ cái
// chứa tối đa 99 số, hết 99 thì sang chữ cái tiếp theo (dùng luôn cho AA, AB... nếu vượt quá Z).
function seqToSystemCode(n) {
  const letterIndex = Math.floor((n - 1) / 99)
  const num = ((n - 1) % 99) + 1
  return `${indexToLetters(letterIndex)}${num}`
}
function indexToLetters(index) {
  let n = index + 1
  let s = ''
  while (n > 0) {
    n -= 1
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26)
  }
  return s
}

async function generateMaHd() {
  const res = await supabase.from('hop_dong').select('ma_hd', { count: 'exact', head: true })
  if (res.error) throw res.error
  return seqToSystemCode((res.count || 0) + 1)
}

async function countXacDinhThoiHan(maNv) {
  const res = await supabase
    .from('hop_dong').select('id', { count: 'exact', head: true })
    .eq('ma_nv', maNv).eq('loai_hd', 'XacDinhThoiHan')
  if (res.error) throw res.error
  return res.count || 0
}

export async function getActiveContractByNv(maNv) {
  const res = await supabase.from('hop_dong').select('*').eq('ma_nv', maNv).eq('trang_thai', 'DangHieuLuc').limit(1)
  if (res.error) throw res.error
  return res.data[0] ? decryptContract(res.data[0]) : null
}

function soNgayConLai(ngayHetHan) {
  if (!ngayHetHan) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const hetHan = new Date(ngayHetHan); hetHan.setHours(0, 0, 0, 0)
  return Math.round((hetHan - today) / 86400000)
}

// Đọc cảnh báo hợp đồng sắp/đã hết hạn + thử việc cần đánh giá — dùng cho tab
// "Theo dõi cảnh báo" ở Tổng quan. Chỉ đọc dữ liệu hop_dong có sẵn, không tạo
// logic nhập liệu hợp đồng mới.
export async function getContractWarnings() {
  const res = await supabase.from('hop_dong').select('*').eq('trang_thai', 'DangHieuLuc')
  if (res.error) throw res.error
  if (!res.data.length) return { canXuLy: [], thuViecCanDanhGia: [] }

  const maNvList = [...new Set(res.data.map((c) => c.ma_nv))]
  const nvRes = await supabase.from('nhan_vien').select('"Mã NV", "Họ tên", "Nơi làm việc"').in('Mã NV', maNvList)
  if (nvRes.error) throw nvRes.error
  const nvMap = Object.fromEntries(nvRes.data.map((n) => [n['Mã NV'], n]))

  const canXuLy = []
  const thuViecCanDanhGia = []
  for (const c of res.data) {
    const trangThaiHienThi = computeDisplayStatus(c)
    if (trangThaiHienThi !== 'SapHetHan' && trangThaiHienThi !== 'DaHetHan') continue
    const nv = nvMap[c.ma_nv] || {}
    const row = {
      maNv: c.ma_nv,
      hoTen: nv['Họ tên'] || '',
      boPhan: nv['Nơi làm việc'] || '',
      ngayHetHan: c.ngay_het_han,
      soNgayConLai: soNgayConLai(c.ngay_het_han),
      trangThaiHienThi,
    }
    if (c.loai_hd === 'ThuViec') {
      thuViecCanDanhGia.push({ ...row, loaiHd: getLoaiHdDisplay(c.loai_hd, c.lan_thu) })
    } else {
      canXuLy.push({ ...row, loaiHd: getLoaiHdDisplay(c.loai_hd, c.lan_thu) })
    }
  }
  canXuLy.sort((a, b) => a.soNgayConLai - b.soNgayConLai)
  thuViecCanDanhGia.sort((a, b) => a.soNgayConLai - b.soNgayConLai)
  return { canXuLy, thuViecCanDanhGia }
}

export async function getContractsTable({ keyword, khoi, loaiHd, lanThu, trangThaiHienThi } = {}) {
  let query = supabase.from('hop_dong').select('*')
  if (loaiHd) query = query.eq('loai_hd', loaiHd)
  if (lanThu != null) query = query.eq('lan_thu', lanThu)
  if (keyword) query = query.or(`ma_hd.ilike.%${keyword}%,ma_nv.ilike.%${keyword}%`)
  const res = await query.order('ngay_ky', { ascending: false })
  if (res.error) throw res.error
  if (!res.data.length) return []

  const maNvList = [...new Set(res.data.map((c) => c.ma_nv))]
  const nvRes = await supabase.from('nhan_vien').select('"Mã NV", "Họ tên", "Khối", "Chức vụ"').in('Mã NV', maNvList)
  if (nvRes.error) throw nvRes.error
  const nvMap = {}
  for (const n of nvRes.data) {
    nvMap[n['Mã NV']] = { ...n, 'Chức vụ': await decryptValue(n['Chức vụ']) }
  }

  let contracts = await Promise.all(res.data.map(async (c) => {
    const decrypted = await decryptContract(c)
    const nv = nvMap[c.ma_nv] || {}
    return {
      ...decrypted,
      hoTen: nv['Họ tên'] || '',
      khoi: nv['Khối'] || '',
      chucVu: nv['Chức vụ'] || '',
      trangThaiHienThi: computeDisplayStatus(c),
      loaiHdHienThi: getLoaiHdDisplay(c.loai_hd, c.lan_thu),
    }
  }))

  if (khoi) contracts = contracts.filter((c) => c.khoi === khoi)
  if (trangThaiHienThi) contracts = contracts.filter((c) => c.trangThaiHienThi === trangThaiHienThi)
  return contracts
}

export async function createContractLogic({ maNv, loaiHd, ngayKy, ngayHieuLuc, ngayHetHan, luongCoBan, phuCapDocHai = 0, phuCapTrachNhiem = 0, ketQuaDanhGia }) {
  const employee = await getEmployeeByMa(maNv.trim())
  if (!employee) throw new Error(`Không tìm thấy nhân viên với mã '${maNv}'. Vui lòng kiểm tra lại.`)

  const existing = await getActiveContractByNv(maNv.trim())
  if (existing) {
    throw new Error(`Nhân viên ${maNv} đang có hợp đồng '${existing.ma_hd}' hiệu lực. Phải thanh lý hợp đồng cũ trước khi ký hợp đồng mới.`)
  }
  if (ngayHetHan && ngayHetHan <= ngayHieuLuc) throw new Error('Ngày hết hạn phải sau Ngày hiệu lực.')

  let lanThu = null
  if (loaiHd === 'XacDinhThoiHan') {
    const soLanDaKy = await countXacDinhThoiHan(maNv.trim())
    if (soLanDaKy >= SO_LAN_TOI_DA_XDTH) {
      throw new Error(`Nhân viên ${maNv} đã ký đủ ${SO_LAN_TOI_DA_XDTH} lần hợp đồng Xác định thời hạn. Theo quy định, lần tiếp theo phải chuyển sang Không xác định thời hạn.`)
    }
    lanThu = soLanDaKy + 1
  }

  const luong = Number(luongCoBan)
  if (Number.isNaN(luong) || luong <= 0) throw new Error('Lương cơ bản phải là số lớn hơn 0.')

  const maHd = await generateMaHd()
  const data = {
    ma_hd: maHd, ma_nv: maNv.trim(), loai_hd: loaiHd, lan_thu: lanThu,
    ngay_ky: ngayKy, ngay_hieu_luc: ngayHieuLuc, ngay_het_han: ngayHetHan || null,
    luong_co_ban: await encryptValue(luong),
    phu_cap_doc_hai: await encryptValue(Number(phuCapDocHai) || 0),
    phu_cap_trach_nhiem: await encryptValue(Number(phuCapTrachNhiem) || 0),
    ket_qua_danh_gia: loaiHd === 'ThuViec' ? (ketQuaDanhGia || 'Chưa đánh giá') : null,
  }
  const res = await supabase.from('hop_dong').insert(data).select().single()
  if (res.error) throw res.error

  await upsertHoSoLuong(maNv.trim(), {
    luong_co_ban: luong,
    phu_cap_co_dinh: (Number(phuCapDocHai) || 0) + (Number(phuCapTrachNhiem) || 0),
  })

  return decryptContract(res.data)
}

// Lấy lịch sử hợp đồng của 1 nhân viên, gộp theo 4 giai đoạn: Thử việc, Lần 1, Lần 2,
// Không xác định thời hạn — đúng bố cục cột trong file Excel công ty. Mỗi giai đoạn lấy
// bản ghi MỚI NHẤT (nếu có ký lại nhiều lần cùng giai đoạn, hiếm khi xảy ra).
export async function getContractHistoryByNv(maNv) {
  const res = await supabase.from('hop_dong').select('*').eq('ma_nv', maNv).order('ngay_ky', { ascending: false })
  if (res.error) throw res.error
  const contracts = await Promise.all(res.data.map(decryptContract))

  function findLatest(pred) {
    const found = contracts.filter(pred)
    return found[0] || null
  }

  const stages = {
    thuViec: findLatest((c) => c.loai_hd === 'ThuViec'),
    lan1: findLatest((c) => c.loai_hd === 'XacDinhThoiHan' && c.lan_thu === 1),
    lan2: findLatest((c) => c.loai_hd === 'XacDinhThoiHan' && c.lan_thu === 2),
    khongXacDinhThoiHan: findLatest((c) => c.loai_hd === 'KhongXacDinhThoiHan'),
  }
  for (const key of Object.keys(stages)) {
    const c = stages[key]
    stages[key] = c ? { ...c, trangThaiHienThi: computeDisplayStatus(c) } : null
  }
  return stages
}


// Bản bulk của getContractHistoryByNv — dùng cho chế độ xem "Theo nhân viên" ở trang Hợp đồng,
// tránh N+1 query (1 lần lấy hết hop_dong + nhan_vien, gộp ở JS).
export async function getContractHistoryTable() {
  const [hdRes, nvRes] = await Promise.all([
    supabase.from('hop_dong').select('*').order('ngay_ky', { ascending: false }),
    supabase.from('nhan_vien').select('"Mã NV", "Họ tên", "Nơi làm việc", "Trạng thái"').order('Mã NV'),
  ])
  if (hdRes.error) throw hdRes.error
  if (nvRes.error) throw nvRes.error

  const contracts = await Promise.all(hdRes.data.map(decryptContract))
  const byNv = {}
  for (const c of contracts) {
    (byNv[c.ma_nv] ||= []).push(c)
  }

  return nvRes.data.map((nv) => {
    const maNv = nv['Mã NV']
    const list = byNv[maNv] || []
    function findLatest(pred) {
      const found = list.filter(pred)
      return found[0] ? { ...found[0], trangThaiHienThi: computeDisplayStatus(found[0]) } : null
    }
    return {
      maNv, hoTen: nv['Họ tên'], boPhan: nv['Nơi làm việc'] || '', trangThaiNv: nv['Trạng thái'],
      thuViec: findLatest((c) => c.loai_hd === 'ThuViec'),
      lan1: findLatest((c) => c.loai_hd === 'XacDinhThoiHan' && c.lan_thu === 1),
      lan2: findLatest((c) => c.loai_hd === 'XacDinhThoiHan' && c.lan_thu === 2),
      khongXacDinhThoiHan: findLatest((c) => c.loai_hd === 'KhongXacDinhThoiHan'),
    }
  }).filter((r) => r.thuViec || r.lan1 || r.lan2 || r.khongXacDinhThoiHan)
}


// input: mảng { maNv, luongCoBan, phuCapTrachNhiem, phuCapDocHai, stages: [{ loaiHd, lanThu, soHd, ngayKy, ngayHieuLuc, ngayHetHan, ketQuaDanhGia }] }
// Giai đoạn cuối cùng có dữ liệu trong mỗi nhân viên -> đánh dấu DangHieuLuc, các giai đoạn
// trước đó (đã bị thay thế) -> DaThanhLy. Chạy lại nhiều lần không tạo trùng — nếu đã có
// hợp đồng cùng (mã NV, loại HĐ, lần thứ mấy) thì cập nhật thay vì thêm mới.
export async function importContractStagesFromExcel(rows) {
  const result = { inserted: 0, updated: 0, errors: [], warnings: [] }
  const withStages = rows.filter((r) => r.stages?.length)
  if (!withStages.length) return result

  // Số thứ tự HĐ tiếp theo, dùng chung 1 bộ đếm cho cả batch để đỡ phải query từng dòng.
  const countRes = await supabase.from('hop_dong').select('ma_hd', { count: 'exact', head: true })
  let nextSeq = (countRes.count || 0) + 1

  for (const row of withStages) {
    try {
      const maNv = row.maNv.trim().toUpperCase()
      const existingRes = await supabase.from('hop_dong').select('*').eq('ma_nv', maNv)
      if (existingRes.error) throw existingRes.error
      const existing = existingRes.data

      const luongCoBan = Number(row.luongCoBan) || 0
      const phuCapTrachNhiem = Number(row.phuCapTrachNhiem) || 0
      const phuCapDocHai = Number(row.phuCapDocHai) || 0

      for (let i = 0; i < row.stages.length; i++) {
        const stage = row.stages[i]
        if (!stage.ngayKy) continue // an toàn: không đủ ngày để tạo hợp đồng
        let ngayHetHan = stage.ngayHetHan
        if (ngayHetHan && ngayHetHan <= stage.ngayHieuLuc) {
          // Ngày kết thúc trong Excel không hợp lệ (≤ ngày bắt đầu) — vẫn tạo hợp đồng,
          // chỉ bỏ trống ngày kết thúc thay vì bỏ qua cả giai đoạn. Cần anh kiểm tra/sửa
          // tay lại ngày kết thúc đúng cho hợp đồng này trong trang Hợp đồng.
          result.warnings.push([row.maNv, `Giai đoạn ${stage.loaiHd}${stage.lanThu ? ' lần ' + stage.lanThu : ''}: ngày kết thúc (${ngayHetHan}) không hợp lệ so với ngày bắt đầu (${stage.ngayHieuLuc}) — đã tạo hợp đồng nhưng BỎ TRỐNG ngày kết thúc, cần vào sửa tay lại.`])
          ngayHetHan = ''
        }
        const isLast = i === row.stages.length - 1
        const match = existing.find((c) => c.loai_hd === stage.loaiHd && (c.lan_thu ?? null) === (stage.lanThu ?? null))

        const payload = {
          ma_nv: maNv, loai_hd: stage.loaiHd, lan_thu: stage.lanThu,
          ngay_ky: stage.ngayKy || null, ngay_hieu_luc: stage.ngayHieuLuc || stage.ngayKy || null,
          ngay_het_han: ngayHetHan || null,
          so_hd_goc: stage.soHd || null,
          trang_thai: isLast ? 'DangHieuLuc' : 'DaThanhLy',
          luong_co_ban: await encryptValue(luongCoBan),
          phu_cap_doc_hai: await encryptValue(phuCapDocHai),
          phu_cap_trach_nhiem: await encryptValue(phuCapTrachNhiem),
        }
        if (stage.loaiHd === 'ThuViec') payload.ket_qua_danh_gia = stage.ketQuaDanhGia || 'Chưa đánh giá'

        if (match) {
          const upd = await supabase.from('hop_dong').update(payload).eq('ma_hd', match.ma_hd)
          if (upd.error) throw upd.error
          result.updated += 1
        } else {
          // Khoá chính LUÔN do hệ thống tự sinh (Mã HĐ hệ thống) — không dùng thẳng số HĐ
          // trong Excel vì đó là số công ty tự đánh tay, không đảm bảo duy nhất toàn hệ thống.
          const maHd = seqToSystemCode(nextSeq)
          nextSeq += 1
          const ins = await supabase.from('hop_dong').insert({ ma_hd: maHd, ...payload })
          if (ins.error) throw ins.error
          result.inserted += 1
        }
      }

      if (luongCoBan > 0) {
        await upsertHoSoLuong(maNv, { luong_co_ban: luongCoBan, phu_cap_co_dinh: phuCapTrachNhiem + phuCapDocHai })
      }
    } catch (err) {
      result.errors.push([row.maNv, err.message])
    }
  }
  return result
}


export class ConflictError extends Error {
  constructor() {
    super('Hợp đồng này đã bị người khác thay đổi kể từ khi bạn mở form. Vui lòng tải lại rồi thử lại.')
    this.name = 'ConflictError'
  }
}

export async function updateContractLogic(maHd, { loaiHd, ngayHetHan, luongCoBan, phuCapDocHai = 0, phuCapTrachNhiem = 0, ketQuaDanhGia, expectedUpdatedAt }) {
  const contractRes = await supabase.from('hop_dong').select('*').eq('ma_hd', maHd).single()
  if (contractRes.error) throw contractRes.error
  const contract = contractRes.data

  if (ngayHetHan && ngayHetHan <= contract.ngay_hieu_luc) throw new Error('Ngày hết hạn phải sau Ngày hiệu lực.')
  const luong = Number(luongCoBan)
  if (Number.isNaN(luong)) throw new Error('Lương cơ bản phải là số.')

  const data = {
    loai_hd: loaiHd, ngay_het_han: ngayHetHan || null,
    luong_co_ban: await encryptValue(luong),
    phu_cap_doc_hai: await encryptValue(Number(phuCapDocHai) || 0),
    phu_cap_trach_nhiem: await encryptValue(Number(phuCapTrachNhiem) || 0),
  }
  if (loaiHd === 'ThuViec' || contract.loai_hd === 'ThuViec') {
    data.ket_qua_danh_gia = ketQuaDanhGia || contract.ket_qua_danh_gia || 'Chưa đánh giá'
  }
  let query = supabase.from('hop_dong').update(data).eq('ma_hd', maHd)
  if (expectedUpdatedAt) query = query.eq('updated_at', expectedUpdatedAt)
  const res = await query.select().maybeSingle()
  if (res.error) throw res.error
  if (!res.data && expectedUpdatedAt) throw new ConflictError()

  await upsertHoSoLuong(contract.ma_nv, {
    luong_co_ban: luong,
    phu_cap_co_dinh: (Number(phuCapDocHai) || 0) + (Number(phuCapTrachNhiem) || 0),
  })

  return decryptContract(res.data)
}

export async function liquidateContract(maHd) {
  const res = await supabase.from('hop_dong').update({ trang_thai: 'DaThanhLy' }).eq('ma_hd', maHd).select().single()
  if (res.error) throw res.error
  return res.data
}

async function upsertHoSoLuong(maNv, data) {
  const payload = { ma_nv: maNv }
  for (const [k, v] of Object.entries(data)) payload[k] = await encryptValue(v)
  const res = await supabase.from('ho_so_luong').upsert(payload, { onConflict: 'ma_nv' })
  if (res.error) throw res.error
}
