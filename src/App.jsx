import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout, { isItemVisible } from './components/Layout'
import Login from './pages/Login'

// Tải theo từng trang (code splitting) — vào Nhân sự không phải tải kèm code
// của Kho/Chuyến hàng/in ấn... giúp trang đầu tiên tải nhanh hơn hẳn.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const NhanSu = lazy(() => import('./pages/NhanSu'))
const HopDong = lazy(() => import('./pages/HopDong'))
const CaKip = lazy(() => import('./pages/CaKip'))
const ChamCong = lazy(() => import('./pages/ChamCong'))
const Luong = lazy(() => import('./pages/Luong'))
const ChuyenHang = lazy(() => import('./pages/ChuyenHang'))
const Kho = lazy(() => import('./pages/Kho'))
const KhachHang = lazy(() => import('./pages/KhachHang'))
const TaiKhoan = lazy(() => import('./pages/TaiKhoan'))
const CaiDat = lazy(() => import('./pages/CaiDat'))
const NhatKy = lazy(() => import('./pages/NhatKy'))

function PageLoading() {
  return <div className="p-8 text-sm text-[var(--color-text-muted)]">Đang tải...</div>
}

// Chặn truy cập trực tiếp qua URL vào trang không được phép xem — phòng trường
// hợp gõ thẳng đường dẫn thay vì bấm qua sidebar (sidebar chỉ ẩn nút, không
// chặn được URL nếu không có lớp này).
function RouteGuard({ children }) {
  const { isAdmin, phongBan, isTruongPhong } = useAuth()
  const location = useLocation()
  const allowed = isItemVisible({ to: location.pathname }, { isAdmin, phongBan, isTruongPhong })
  if (!allowed) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[var(--color-text-muted)]">
        Đang tải...
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <Layout>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/nhan-su" element={<RouteGuard><NhanSu /></RouteGuard>} />
          <Route path="/hop-dong" element={<RouteGuard><HopDong /></RouteGuard>} />
          <Route path="/ca-kip" element={<RouteGuard><CaKip /></RouteGuard>} />
          <Route path="/cham-cong" element={<RouteGuard><ChamCong /></RouteGuard>} />
          <Route path="/luong" element={<RouteGuard><Luong /></RouteGuard>} />
          <Route path="/chuyen-hang" element={<RouteGuard><ChuyenHang /></RouteGuard>} />
          <Route path="/kho" element={<RouteGuard><Kho /></RouteGuard>} />
          <Route path="/khach-hang" element={<RouteGuard><KhachHang /></RouteGuard>} />
          <Route path="/tai-khoan" element={<RouteGuard><TaiKhoan /></RouteGuard>} />
          <Route path="/nhat-ky" element={<RouteGuard><NhatKy /></RouteGuard>} />
          <Route path="/cai-dat" element={<CaiDat />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}
