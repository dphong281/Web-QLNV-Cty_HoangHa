import { supabase } from './supabase'

export async function getAllInventory({ loai, idDonVi, tuNgay, denNgay } = {}) {
  let query = supabase.from('nhap_xuat_kho').select('*')
  if (loai) query = query.eq('loai', loai)
  if (idDonVi) query = query.eq('id_don_vi', idDonVi)
  if (tuNgay) query = query.gte('ngay', tuNgay)
  if (denNgay) query = query.lte('ngay', denNgay)
  const res = await query.order('ngay', { ascending: false })
  if (res.error) throw res.error

  const donViIds = [...new Set(res.data.map((r) => r.id_don_vi).filter(Boolean))]
  const dvRes = donViIds.length ? await supabase.from('don_vi').select('id, ten_don_vi').in('id', donViIds) : { data: [] }
  const dvMap = Object.fromEntries((dvRes.data || []).map((d) => [d.id, d.ten_don_vi]))

  return res.data.map((r) => ({ ...r, tenDonVi: dvMap[r.id_don_vi] || '' }))
}

export async function createInventoryRecord(data) {
  const res = await supabase.from('nhap_xuat_kho').insert(data).select().single()
  if (res.error) throw res.error
  return res.data
}

export async function deleteInventoryRecord(id) {
  const res = await supabase.from('nhap_xuat_kho').delete().eq('id', id)
  if (res.error) throw res.error
}
