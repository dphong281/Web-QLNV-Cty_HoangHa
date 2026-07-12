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

async function generateMaHd() {
  const res = await supabase.from('hop_dong').select('ma_hd', { count: 'exact', head: true })
  if (res.error) throw res.error
  return `HD${String((res.count || 0) + 1).padStart(4, '0')}`
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
  const nvMap = Object.fromEntries(nvRes.data.map((n) => [n['Mã NV'], n]))

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

export async function createContractLogic({ maNv, loaiHd, ngayKy, ngayHieuLuc, ngayHetHan, luongCoBan, phuCapDocHai = 0, phuCapTrachNhiem = 0 }) {
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
  }
  const res = await supabase.from('hop_dong').insert(data).select().single()
  if (res.error) throw res.error

  await upsertHoSoLuong(maNv.trim(), {
    luong_co_ban: luong,
    phu_cap_co_dinh: (Number(phuCapDocHai) || 0) + (Number(phuCapTrachNhiem) || 0),
  })

  return decryptContract(res.data)
}

export class ConflictError extends Error {
  constructor() {
    super('Hợp đồng này đã bị người khác thay đổi kể từ khi bạn mở form. Vui lòng tải lại rồi thử lại.')
    this.name = 'ConflictError'
  }
}

export async function updateContractLogic(maHd, { loaiHd, ngayHetHan, luongCoBan, phuCapDocHai = 0, phuCapTrachNhiem = 0, expectedUpdatedAt }) {
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
