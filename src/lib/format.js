export function formatCurrency(value) {
  const n = Number(value) || 0
  return n.toLocaleString('vi-VN') + ' đ'
}

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('vi-VN')
}

export const KHOI_LABELS = { VanPhong: 'Văn phòng', CayXang: 'Cửa hàng', TaiXe: 'Tài xế' }

export const TRANG_THAI_NV_LABELS = {
  DangLamViec: 'Đang làm việc',
  TamNghi: 'Tạm nghỉ',
  DaNghiViec: 'Đã nghỉ việc',
}
export const TRANG_THAI_NV_COLORS = {
  DangLamViec: 'bg-[var(--color-good)]/10 text-[var(--color-good)]',
  TamNghi: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  DaNghiViec: 'bg-black/5 text-[var(--color-text-muted)]',
}

export const PHONG_BAN_LABELS = {
  hanh_chinh: 'Hành chính',
  ke_toan: 'Kế toán',
  khai_thac: 'Khai thác',
  cua_hang: 'Cửa hàng',
}

export const CHUC_VU_LABELS = {
  truong_phong_hanh_chinh: 'Trưởng phòng Hành chính',
  nhan_vien_hanh_chinh: 'Nhân viên Hành chính',
  ke_toan_truong: 'Kế toán trưởng',
  ke_toan_vien: 'Kế toán viên',
  truong_phong_khai_thac: 'Trưởng phòng Khai thác',
  nhan_vien_khai_thac: 'Nhân viên Khai thác',
  truong_ca_cua_hang: 'Trưởng ca cửa hàng',
  nhan_vien_cua_hang: 'Nhân viên cửa hàng',
}

export const PHONG_BAN_CHUC_VU = {
  hanh_chinh: ['truong_phong_hanh_chinh', 'nhan_vien_hanh_chinh'],
  ke_toan: ['ke_toan_truong', 'ke_toan_vien'],
  khai_thac: ['truong_phong_khai_thac', 'nhan_vien_khai_thac'],
  cua_hang: ['truong_ca_cua_hang', 'nhan_vien_cua_hang'],
}

export const TRUONG_PHONG_CHUC_VU = [
  'truong_phong_hanh_chinh',
  'ke_toan_truong',
  'truong_phong_khai_thac',
  'truong_ca_cua_hang',
]

export const LOAI_HD_LABELS = {
  ThuViec: 'Thử việc',
  XacDinhThoiHan: 'Xác định thời hạn',
  KhongXacDinhThoiHan: 'Không xác định thời hạn',
}

export const TRANG_THAI_HD_LABELS = {
  DangHieuLuc: 'Đang hiệu lực',
  DaThanhLy: 'Đã thanh lý',
  HetHan: 'Hết hạn',
}
