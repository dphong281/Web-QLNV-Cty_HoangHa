import { supabase } from './supabase'

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`

async function callAdminFunction(payload) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) throw new Error('Chưa đăng nhập')

  const res = await fetch(FUNCTIONS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Có lỗi xảy ra, thử lại sau.')
  return json
}

export function adminCreateUser(data) {
  return callAdminFunction({ action: 'create', ...data })
}
export function adminToggleActive(userId, isActive) {
  return callAdminFunction({ action: 'toggle_active', user_id: userId, is_active: isActive })
}
export function adminResetPassword(userId, newPassword) {
  return callAdminFunction({ action: 'reset_password', user_id: userId, new_password: newPassword })
}

export async function getAllAccounts() {
  const res = await supabase.from('tai_khoan').select('*').order('ho_ten')
  if (res.error) throw res.error
  return res.data
}
