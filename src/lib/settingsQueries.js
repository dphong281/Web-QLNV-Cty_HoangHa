import { supabase } from './supabase'

export async function getAllSettings() {
  const res = await supabase.from('cai_dat_he_thong').select('*').order('khoa')
  if (res.error) throw res.error
  return res.data
}

export async function getValue(khoa, fallback = null) {
  const res = await supabase.from('cai_dat_he_thong').select('gia_tri').eq('khoa', khoa).limit(1)
  if (res.error) throw res.error
  return res.data.length ? res.data[0].gia_tri : fallback
}

export async function setValue(khoa, giaTri, moTa) {
  const payload = { khoa, gia_tri: giaTri, updated_at: new Date().toISOString() }
  if (moTa !== undefined) payload.mo_ta = moTa
  const res = await supabase.from('cai_dat_he_thong').upsert(payload, { onConflict: 'khoa' })
  if (res.error) throw res.error
}

export async function deleteSetting(khoa) {
  const res = await supabase.from('cai_dat_he_thong').delete().eq('khoa', khoa)
  if (res.error) throw res.error
}
