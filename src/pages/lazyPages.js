import { lazy } from 'react'

// Định nghĩa hàm import() 1 lần duy nhất cho mỗi trang — dùng chung cho cả lazy() (React Router)
// và preload() (tải trước ngầm khi rê chuột vào menu, xem Layout.jsx) để bấm vào không phải
// chờ tải mới thấy trang.
const importers = {
  '/nhan-su': () => import('./NhanSu'),
  '/hop-dong': () => import('./HopDong'),
  '/ca-kip': () => import('./CaKip'),
  '/cham-cong': () => import('./ChamCong'),
  '/luong': () => import('./Luong'),
  '/chuyen-hang': () => import('./ChuyenHang'),
  '/kho': () => import('./Kho'),
  '/khach-hang': () => import('./KhachHang'),
  '/tai-khoan': () => import('./TaiKhoan'),
  '/nhat-ky': () => import('./NhatKy'),
  '/cai-dat': () => import('./CaiDat'),
}

export const LazyNhanSu = lazy(importers['/nhan-su'])
export const LazyHopDong = lazy(importers['/hop-dong'])
export const LazyCaKip = lazy(importers['/ca-kip'])
export const LazyChamCong = lazy(importers['/cham-cong'])
export const LazyLuong = lazy(importers['/luong'])
export const LazyChuyenHang = lazy(importers['/chuyen-hang'])
export const LazyKho = lazy(importers['/kho'])
export const LazyKhachHang = lazy(importers['/khach-hang'])
export const LazyTaiKhoan = lazy(importers['/tai-khoan'])
export const LazyNhatKy = lazy(importers['/nhat-ky'])
export const LazyCaiDat = lazy(importers['/cai-dat'])

const preloaded = new Set()

// Gọi khi rê chuột vào 1 mục trong sidebar — tải trước ngầm code của trang đó, để lúc bấm
// vào thì trang đã có sẵn (hoặc gần xong), không phải chờ mới thấy "Đang tải...".
export function preloadPage(path) {
  if (preloaded.has(path) || !importers[path]) return
  preloaded.add(path)
  importers[path]().catch(() => { preloaded.delete(path) })
}
