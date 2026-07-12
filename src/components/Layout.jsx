import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
  { to: '/tai-khoan', label: 'Tài khoản', adminOnly: true },
  { to: '/nhat-ky', label: 'Nhật ký hoạt động' },
  { to: '/cai-dat', label: 'Cài đặt' },
]

export default function Layout({ children }) {
  const { hoTen, isAdmin, phongBan, chucVu, signOut } = useAuth()

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  return (
    <div className="h-screen flex overflow-hidden">
      <aside className="w-64 shrink-0 h-full overflow-y-auto bg-[var(--color-ink)] text-white flex flex-col">
        <div className="px-6 py-6 border-b border-white/10">
          <div className="text-[11px] tracking-[0.2em] text-[var(--color-accent)] font-semibold uppercase">
            Hoàng Hà
          </div>
          <div className="font-display text-xl font-semibold leading-tight mt-1">
            Quản lý<br />Nhân sự
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
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
      </aside>
      <main className="flex-1 min-w-0 h-full overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
