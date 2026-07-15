export function Card({ children, className = '' }) {
  return (
    <div className={`bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl ${className}`}>
      {children}
    </div>
  )
}

export function StatCard({ label, value, sub, accent = false }) {
  return (
    <Card className="p-5">
      <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
        {label}
      </div>
      <div
        className={`font-display text-2xl font-semibold mt-2 ${
          accent ? 'text-[var(--color-accent-dark)]' : 'text-[var(--color-ink)]'
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-[var(--color-text-muted)] mt-1">{sub}</div>}
    </Card>
  )
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-[var(--color-ink)] text-white hover:bg-[var(--color-ink-2)]',
    accent: 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-dark)]',
    ghost: 'bg-transparent text-[var(--color-text)] hover:bg-black/5 border border-[var(--color-line)]',
    danger: 'bg-transparent text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}

export function Input({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-[var(--color-text)] mb-1.5">{label}</span>}
      <input
        className={`w-full px-3 py-2 rounded-lg border border-[var(--color-line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)] ${className}`}
        {...props}
      />
    </label>
  )
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-[var(--color-text)] mb-1.5">{label}</span>}
      <select
        className={`w-full px-3 py-2 rounded-lg border border-[var(--color-line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)] ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

export function Textarea({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-[var(--color-text)] mb-1.5">{label}</span>}
      <textarea
        className={`w-full px-3 py-2 rounded-lg border border-[var(--color-line)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)] ${className}`}
        {...props}
      />
    </label>
  )
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 border-b border-[var(--color-line)] mb-4 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
            active === t.key
              ? 'border-[var(--color-accent)] text-[var(--color-ink)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Checkbox({ label, checked, onChange, className = '' }) {
  return (
    <label className={`flex items-center gap-2 text-sm cursor-pointer select-none ${className}`}>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        className="w-4 h-4 rounded border-[var(--color-line)] accent-[var(--color-accent)]"
      />
      <span className="text-[var(--color-text)]">{label}</span>
    </label>
  )
}

export function Modal({ open, onClose, title, children, wide = false, size }) {
  if (!open) return null
  const maxWidth = size === 'xl' ? 'max-w-4xl' : wide ? 'max-w-2xl' : 'max-w-md'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={`relative bg-white rounded-2xl shadow-xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-line)] sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-display text-lg font-semibold text-[var(--color-ink)]">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-[var(--color-text-muted)]"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function EmptyState({ title, sub, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-[var(--color-accent)]/15 flex items-center justify-center text-[var(--color-accent-dark)] font-display text-xl mb-3">
        —
      </div>
      <div className="font-medium text-[var(--color-ink)]">{title}</div>
      {sub && <div className="text-sm text-[var(--color-text-muted)] mt-1 max-w-sm">{sub}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function LoadingState({ label = 'Đang tải...' }) {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-[var(--color-text-muted)]">
      {label}
    </div>
  )
}

export function ErrorState({ message }) {
  return (
    <div className="rounded-lg bg-[var(--color-danger)]/8 border border-[var(--color-danger)]/20 text-[var(--color-danger)] text-sm px-4 py-3">
      Lỗi: {message}
    </div>
  )
}

export function ComingSoon({ title }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)] mb-2">{title}</h1>
      <Card className="p-10 text-center text-[var(--color-text-muted)]">
        Module này đang được xây dựng ở giai đoạn tiếp theo.
      </Card>
    </div>
  )
}
