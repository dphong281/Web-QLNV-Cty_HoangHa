import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('qlnv_last_email')
      if (saved) setEmail(saved)
    } catch (_e) {
      // bỏ qua nếu trình duyệt chặn localStorage
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Email hoặc mật khẩu không đúng.'
          : error.message
      )
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-[11px] tracking-[0.2em] text-[var(--color-accent-dark)] font-semibold uppercase">
            Hoàng Hà
          </div>
          <div className="font-display text-2xl font-semibold text-[var(--color-ink)] mt-1">
            Quản lý Nhân sự
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[var(--color-line)] rounded-2xl p-6 space-y-4"
        >
          <h1 className="font-display text-lg font-semibold text-[var(--color-ink)]">Đăng nhập</h1>

          <label className="block">
            <span className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Email</span>
            <input
              type="email"
              required
              autoFocus={!email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)]"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Mật khẩu</span>
            <input
              type="password"
              required
              autoFocus={!!email}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)]"
            />
          </label>

          {error && (
            <div className="rounded-lg bg-[var(--color-danger)]/8 border border-[var(--color-danger)]/20 text-[var(--color-danger)] text-sm px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-[var(--color-ink)] text-white hover:bg-[var(--color-ink-2)] disabled:opacity-50"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="text-xs text-center text-[var(--color-text-muted)] mt-4">
          Chưa có tài khoản? Liên hệ Admin để được cấp tài khoản.
        </p>
      </div>
    </div>
  )
}
