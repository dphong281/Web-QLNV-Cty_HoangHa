import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout, { isItemVisible } from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NhanSu from './pages/NhanSu'
import HopDong from './pages/HopDong'
import CaKip from './pages/CaKip'
import ChamCong from './pages/ChamCong'
import Luong from './pages/Luong'
import ChuyenHang from './pages/ChuyenHang'
import Kho from './pages/Kho'
import KhachHang from './pages/KhachHang'
import TaiKhoan from './pages/TaiKhoan'
import CaiDat from './pages/CaiDat'
import NhatKy from './pages/NhatKy'

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
    </Layout>
  )
}
