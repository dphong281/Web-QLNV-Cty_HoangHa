import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getAllAccounts, adminCreateUser, adminToggleActive, adminResetPassword } from '../lib/adminApi'
import { PHONG_BAN_LABELS, PHONG_BAN_CHUC_VU, CHUC_VU_LABELS } from '../lib/format'
import { Card, Button, Badge, Input, Select, Modal, LoadingState, ErrorState, EmptyState } from '../components/ui'

const EMPTY_FORM = { email: '', password: '', ho_ten: '', is_admin: false, phong_ban: 'hanh_chinh', chuc_vu: 'nhan_vien_hanh_chinh', ma_cay_xang: '' }

export default function TaiKhoan() {
  const { isAdmin, phongBan, isTruongPhong } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const [resetTarget, setResetTarget] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setList(await getAllAccounts())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM, phong_ban: isAdmin ? 'hanh_chinh' : phongBan, chuc_vu: PHONG_BAN_CHUC_VU[isAdmin ? 'hanh_chinh' : phongBan][1] })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setFormError(null)
    setSaving(true)
    try {
      await adminCreateUser(form)
      setModalOpen(false)
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(acc) {
    if (!confirm(`${acc.is_active ? 'Khoá' : 'Mở khoá'} tài khoản "${acc.ho_ten}"?`)) return
    try {
      await adminToggleActive(acc.user_id, !acc.is_active)
      load()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setResetting(true)
    try {
      await adminResetPassword(resetTarget.user_id, newPassword)
      setResetTarget(null)
      setNewPassword('')
      alert('Đã đặt lại mật khẩu.')
    } catch (err) {
      alert('Lỗi: ' + err.message)
    } finally {
      setResetting(false)
    }
  }

  const canCreate = isAdmin || isTruongPhong

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">Tài khoản</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{list.length} tài khoản</p>
        </div>
        {canCreate && <Button variant="accent" onClick={openAdd}>+ Tạo tài khoản</Button>}
      </div>

      <Card className="overflow-x-auto">
        {loading ? <LoadingState /> : error ? <div className="p-4"><ErrorState message={error} /></div> : list.length === 0 ? (
          <EmptyState title="Chưa có tài khoản nào" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide border-b border-[var(--color-line)]">
                <th className="px-4 py-3 font-medium sticky left-0 bg-[var(--color-surface)]">Họ tên</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Phòng ban / Chức vụ</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {list.map((acc) => (
                <tr key={acc.user_id} className="border-b border-[var(--color-line)] last:border-0 hover:bg-black/[0.015]">
                  <td className="px-4 py-2.5 font-medium text-[var(--color-ink)] sticky left-0 bg-[var(--color-surface)] whitespace-nowrap">{acc.ho_ten}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)] hidden sm:table-cell whitespace-nowrap">{acc.email}</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)] hidden md:table-cell whitespace-nowrap">
                    {acc.is_admin ? <Badge className="bg-[var(--color-accent)]/12 text-[var(--color-accent-dark)]">Admin</Badge> : `${PHONG_BAN_LABELS[acc.phong_ban] || ''} — ${CHUC_VU_LABELS[acc.chuc_vu] || ''}`}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <Badge className={acc.is_active ? 'bg-[var(--color-good)]/10 text-[var(--color-good)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'}>
                      {acc.is_active ? 'Hoạt động' : 'Đã khoá'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right space-x-2 whitespace-nowrap">
                    {isAdmin && <button onClick={() => setResetTarget(acc)} className="text-[var(--color-ink)] hover:underline text-sm font-medium">Đặt lại MK</button>}
                    {(isAdmin || (isTruongPhong && acc.phong_ban === phongBan && !acc.is_admin)) && (
                      <button onClick={() => handleToggle(acc)} className="text-[var(--color-danger)] hover:underline text-sm font-medium">{acc.is_active ? 'Khoá' : 'Mở khoá'}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tạo tài khoản mới">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Họ tên *" required value={form.ho_ten} onChange={(e) => setForm({ ...form, ho_ten: e.target.value })} />
          <Input label="Email *" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Mật khẩu tạm *" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_admin} onChange={(e) => setForm({ ...form, is_admin: e.target.checked })} />
              Tài khoản Admin (toàn quyền hệ thống)
            </label>
          )}
          {!form.is_admin && (
            <>
              <Select label="Phòng ban" value={form.phong_ban} disabled={!isAdmin} onChange={(e) => setForm({ ...form, phong_ban: e.target.value, chuc_vu: PHONG_BAN_CHUC_VU[e.target.value][1] })}>
                {Object.entries(PHONG_BAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
              <Select label="Chức vụ" value={form.chuc_vu} onChange={(e) => setForm({ ...form, chuc_vu: e.target.value })}>
                {PHONG_BAN_CHUC_VU[form.phong_ban]?.map((cv) => <option key={cv} value={cv}>{CHUC_VU_LABELS[cv]}</option>)}
              </Select>
              {form.phong_ban === 'cua_hang' && (
                <Input label="Mã cây xăng phụ trách" value={form.ma_cay_xang} onChange={(e) => setForm({ ...form, ma_cay_xang: e.target.value })} />
              )}
            </>
          )}
          {formError && <ErrorState message={formError} />}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Huỷ</Button>
            <Button type="submit" variant="accent" disabled={saving}>{saving ? 'Đang tạo...' : 'Tạo tài khoản'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`Đặt lại mật khẩu — ${resetTarget?.ho_ten}`}>
        <form onSubmit={handleReset} className="space-y-4">
          <Input label="Mật khẩu mới *" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setResetTarget(null)}>Huỷ</Button>
            <Button type="submit" variant="accent" disabled={resetting}>{resetting ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
