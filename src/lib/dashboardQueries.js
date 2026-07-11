import { supabase } from './supabase'
import { decryptValue } from './fernetCrypto'

const NGUONG_SAP_HET_HAN_NGAY = 30

// Y hệt ContractLogic.compute_display_status() bên Python
export function computeDisplayStatus(contract) {
  if (contract.trang_thai === 'DaThanhLy') return 'DaThanhLy'
  if (!contract.ngay_het_han) return 'DangHieuLuc'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const hetHan = new Date(contract.ngay_het_han)
  hetHan.setHours(0, 0, 0, 0)
  const soNgayConLai = Math.round((hetHan - today) / (1000 * 60 * 60 * 24))
  if (soNgayConLai < 0) return 'DaHetHan'
  if (soNgayConLai <= NGUONG_SAP_HET_HAN_NGAY) return 'SapHetHan'
  return 'DangHieuLuc'
}

// Y hệt EmployeeModel.get_dashboard_summary_stats() + ContractModel.get_dashboard_contract_raw()
// + DashboardLogic._tinh_chi_so_va_canh_bao()
export async function getChiSoChungVaCanhBao() {
  const [empRes, hdRes] = await Promise.all([
    supabase.from('nhan_vien').select('"Mã NV", "Trạng thái", "Giới tính"'),
    supabase.from('hop_dong').select('ma_nv, loai_hd, lan_thu, ngay_het_han, trang_thai'),
  ])
  if (empRes.error) throw empRes.error
  if (hdRes.error) throw hdRes.error

  const rows = empRes.data
  const byTrangThai = {}
  const byGioiTinh = {}
  for (const r of rows) {
    if (r['Trạng thái']) byTrangThai[r['Trạng thái']] = (byTrangThai[r['Trạng thái']] || 0) + 1
    if (r['Giới tính'] && r['Trạng thái'] === 'DangLamViec') {
      byGioiTinh[r['Giới tính']] = (byGioiTinh[r['Giới tính']] || 0) + 1
    }
  }

  const contracts = hdRes.data
  const dangThuViecSet = new Set(
    contracts.filter((c) => c.loai_hd === 'ThuViec' && c.trang_thai === 'DangHieuLuc').map((c) => c.ma_nv)
  )

  const chiSoChung = {
    tongCbcnv: rows.length,
    dangLamViec: byTrangThai['DangLamViec'] || 0,
    dangThuViec: dangThuViecSet.size,
    daNghiViec: byTrangThai['DaNghiViec'] || 0,
    nam: byGioiTinh['Nam'] || 0,
    nu: byGioiTinh['Nữ'] || 0,
  }

  const dem = {
    'ThuViec|null|SapHetHan': 0,
    'XacDinhThoiHan|1|SapHetHan': 0,
    'XacDinhThoiHan|2|SapHetHan': 0,
    'ThuViec|null|DaHetHan': 0,
    'XacDinhThoiHan|1|DaHetHan': 0,
    'XacDinhThoiHan|2|DaHetHan': 0,
  }
  for (const c of contracts) {
    const trangThaiHienThi = computeDisplayStatus(c)
    const key = `${c.loai_hd}|${c.lan_thu ?? 'null'}|${trangThaiHienThi}`
    if (key in dem) dem[key] += 1
  }

  const canhBaoHd = {
    tvSapHet: dem['ThuViec|null|SapHetHan'],
    l1SapHet: dem['XacDinhThoiHan|1|SapHetHan'],
    l2SapHet: dem['XacDinhThoiHan|2|SapHetHan'],
    tvHetHan: dem['ThuViec|null|DaHetHan'],
    l1HetHan: dem['XacDinhThoiHan|1|DaHetHan'],
    l2HetHan: dem['XacDinhThoiHan|2|DaHetHan'],
  }

  return { chiSoChung, canhBaoHd }
}

// Y hệt EmployeeModel.get_dashboard_active_extra()
export async function getPhanBoVaThieuThongTin() {
  const res = await supabase
    .from('nhan_vien')
    .select('"Mã NV", "Họ tên", "Số ĐT", "Khối", "Nơi làm việc", "Ngạch", "Trạng thái"')
    .eq('Trạng thái', 'DangLamViec')
  if (res.error) throw res.error

  const rows = res.data
  const byDonVi = {}
  const byNgach = {}
  const thieuThongTinRaw = []

  for (const r of rows) {
    if (r['Nơi làm việc']) byDonVi[r['Nơi làm việc']] = (byDonVi[r['Nơi làm việc']] || 0) + 1
    if (r['Ngạch']) byNgach[r['Ngạch']] = (byNgach[r['Ngạch']] || 0) + 1
    const soDtDecrypted = await decryptValue(r['Số ĐT'])
    if (!soDtDecrypted || !r['Khối']) thieuThongTinRaw.push(r)
  }

  const phanBoDonVi = Object.entries(byDonVi)
    .map(([ten, soLuong]) => ({ ten, soLuong }))
    .sort((a, b) => b.soLuong - a.soLuong)
  const phanBoNgach = Object.entries(byNgach)
    .map(([ten, soLuong]) => ({ ten, soLuong }))
    .sort((a, b) => a.ten.localeCompare(b.ten))

  const thieuThongTin = []
  for (const r of thieuThongTinRaw) {
    const thieu = []
    if (!(await decryptValue(r['Số ĐT']))) thieu.push('Số điện thoại')
    if (!r['Khối']) thieu.push('Khối')
    thieuThongTin.push(`${r['Mã NV']} - ${r['Họ tên']}: thiếu ${thieu.join(', ')}`)
  }

  return { phanBoDonVi, phanBoNgach, thieuThongTin }
}
