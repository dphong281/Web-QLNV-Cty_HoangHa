import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { preloadPage } from '../pages/lazyPages'

const NAV_ITEMS = [
  { to: '/', label: 'Tổng quan', end: true },
  { to: '/nhan-su', label: 'Nhân sự' },
  { to: '/hop-dong', label: 'Hợp đồng' },
  { to: '/ca-kip', label: 'Ca kíp' },
  { to: '/cham-cong', label: 'Chấm công' },
  { to: '/luong', label: 'Lương' },
  { to: '/chuyen-hang', label: 'Chuyến hàng' },
  { to: '/kho', label: 'Kho' },
  { to: '/khach-hang', label: 'Khách hàng' },
  { to: '/tai-khoan', label: 'Tài khoản' },
  { to: '/nhat-ky', label: 'Nhật ký hoạt động' },
  { to: '/cai-dat', label: 'Cài đặt' },
]

// Phòng Hành chính (nhân viên lẫn trưởng phòng) chỉ được xem đúng 4 module này
// + Cài đặt (để tự đổi mật khẩu). Trưởng phòng có thêm Tài khoản (để tạo tài
// khoản cho đúng phòng ban mình — logic giới hạn theo phòng ban nằm ở TaiKhoan.jsx).
// Các phòng ban khác (kế toán/khai thác/cửa hàng) CHƯA giới hạn — làm sau.
export const HANH_CHINH_ALLOWED = ['/', '/nhan-su', '/hop-dong', '/luong', '/cai-dat']

export function isItemVisible(item, { isAdmin, phongBan, isTruongPhong }) {
  if (isAdmin) return true
  if (item.to === '/tai-khoan') return isTruongPhong
  if (phongBan === 'hanh_chinh') return HANH_CHINH_ALLOWED.includes(item.to)
  return true
}

export default function Layout({ children }) {
  const { hoTen, isAdmin, phongBan, chucVu, isTruongPhong, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const visibleItems = NAV_ITEMS.filter((item) => isItemVisible(item, { isAdmin, phongBan, isTruongPhong }))

  // Đóng menu mỗi khi chuyển trang (bấm 1 mục trong menu di động).
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const sidebarContent = (
    <>
      <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="text-[11px] tracking-[0.2em] text-[var(--color-accent)] font-semibold uppercase">
            Hoàng Hà
          </div>
          <div className="font-display text-xl font-semibold leading-tight mt-1">
            Quản lý<br />Nhân sự
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-white/70 hover:text-white text-2xl leading-none px-2"
          aria-label="Đóng menu"
        >
          ×
        </button>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onMouseEnter={() => preloadPage(to)}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center justify-between gap-2 px-2">
          <div className="min-w-0">
            <div className="text-xs text-white/40">
              {isAdmin ? 'Admin' : [phongBan, chucVu].filter(Boolean).join(' · ') || 'Đang đăng nhập'}
            </div>
            <div className="text-sm font-medium truncate">{hoTen || '—'}</div>
          </div>
          <button
            onClick={signOut}
            className="shrink-0 text-xs text-white/60 hover:text-white px-2 py-1.5 rounded-md hover:bg-white/10"
            title="Đăng xuất"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar máy tính — luôn hiện, giữ nguyên như cũ */}
      <aside className="hidden md:flex w-64 shrink-0 h-full overflow-y-auto bg-[var(--color-ink)] text-white flex-col">
        {sidebarContent}
      </aside>

      {/* Sidebar điện thoại — ẩn mặc định, bấm hamburger mới hiện dạng ngăn kéo phủ lên */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 max-w-[80vw] h-full overflow-y-auto bg-[var(--color-ink)] text-white flex flex-col">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        {/* Thanh trên cùng chỉ hiện trên điện thoại — nút mở menu */}
        <div className="md:hidden shrink-0 flex items-center gap-3 px-4 py-3 bg-[var(--color-ink)] text-white">
          <button onClick={() => setMobileOpen(true)} aria-label="Mở menu" className="p-1 -ml-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="font-display text-base font-semibold">Quản lý Nhân sự</div>
        </div>

        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-4 py-5 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
