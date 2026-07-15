export function formatCurrency(value) {
  const n = Number(value) || 0
  return n.toLocaleString('vi-VN') + ' đ'
}

// Parse ngày một cách chắc chắn, tránh trình duyệt hiểu nhầm "23/07/2021" (dd/mm/yyyy) thành
// mm/dd/yyyy — với ngày <=12 sẽ bị hiểu SAI âm thầm (không báo lỗi) nếu dùng thẳng `new Date(str)`.
export function parseFlexibleDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const text = String(value).trim()
  const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) {
    const [, d, m, y] = dmy
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return Number.isNaN(date.getTime()) ? null : date
  }
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const [, y, m, d] = iso
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return Number.isNaN(date.getTime()) ? null : date
  }
  const fallback = new Date(text)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

export function formatDate(value) {
  const d = parseFlexibleDate(value)
  if (!d) return '—'
  return d.toLocaleDateString('vi-VN')
}

export const KHOI_LABELS = { VanPhong: 'Văn phòng', CayXang: 'Cửa hàng', TaiXe: 'Tài xế' }

export const TRANG_THAI_NV_LABELS = {
  ThuViec: 'Thử việc',
  DangLamViec: 'Đang làm việc',
  TamNghi: 'Tạm nghỉ',
  NghiThaiSan: 'Nghỉ thai sản',
  DaNghiViec: 'Đã nghỉ việc',
}
export const TRANG_THAI_NV_COLORS = {
  ThuViec: 'bg-[var(--color-accent)]/10 text-[var(--color-accent-dark)]',
  DangLamViec: 'bg-[var(--color-good)]/10 text-[var(--color-good)]',
  TamNghi: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  NghiThaiSan: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
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

export const TINH_TRANG_HON_NHAN_OPTIONS = ['Độc thân', 'Đã kết hôn', 'Khác']

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
