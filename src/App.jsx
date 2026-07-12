import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
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
        <Route path="/nhan-su" element={<NhanSu />} />
        <Route path="/hop-dong" element={<HopDong />} />
        <Route path="/ca-kip" element={<CaKip />} />
        <Route path="/cham-cong" element={<ChamCong />} />
        <Route path="/luong" element={<Luong />} />
        <Route path="/chuyen-hang" element={<ChuyenHang />} />
        <Route path="/kho" element={<Kho />} />
        <Route path="/khach-hang" element={<KhachHang />} />
        <Route path="/tai-khoan" element={<TaiKhoan />} />
        <Route path="/nhat-ky" element={<NhatKy />} />
        <Route path="/cai-dat" element={<CaiDat />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
