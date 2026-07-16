import { supabase } from './supabase'

export async function getNhatKyList(limit = 50) {
  const res = await supabase.from('nhat_ky_hoat_dong').select('*').order('created_at', { ascending: false }).limit(limit)
  if (res.error) throw res.error
  return res.data
}

export async function getAllTaiKhoanForFilter() {
  const res = await supabase.from('tai_khoan').select('user_id, ho_ten').order('ho_ten')
  if (res.error) throw res.error
  return res.data
}
