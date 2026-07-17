import { supabase } from './supabase'

export async function getAvailableDrivers() {
  const busyRes = await supabase.from('chuyen_hang').select('ma_nv').eq('trang_thai', 'DangDi')
  if (busyRes.error) throw busyRes.error
  const busyIds = new Set(busyRes.data.map((r) => r.ma_nv).filter(Boolean))

  const empRes = await supabase.from('nhan_vien').select('"Mã NV", "Họ tên"').eq('Khối', 'TaiXe').eq('Trạng thái', 'DangLamViec').order('Mã NV')
  if (empRes.error) throw empRes.error
  return empRes.data.filter((e) => !busyIds.has(e['Mã NV'])).map((e) => ({ maNv: e['Mã NV'], hoTen: e['Họ tên'] }))
}

export async function getAllXeBon() {
  const res = await supabase.from('xe_bon').select('*').order('bien_so')
  if (res.error) throw res.error
  return res.data
}

async function generateMaChuyen() {
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `CH-${todayStr}-`
  const res = await supabase.from('chuyen_hang').select('ma_chuyen').like('ma_chuyen', `${prefix}%`)
  if (res.error) throw res.error
  return `${prefix}${String(res.data.length + 1).padStart(3, '0')}`
}

export async function createShipment(data) {
  const maChuyen = await generateMaChuyen()
  const res = await supabase.from('chuyen_hang').insert({ ...data, ma_chuyen: maChuyen, trang_thai: 'DangDi' }).select().single()
  if (res.error) throw res.error
  return res.data
}

export async function updateShipmentStatus(id, trangThai, extra = {}) {
  const res = await supabase.from('chuyen_hang').update({ trang_thai: trangThai, ...extra }).eq('id', id)
  if (res.error) throw res.error
}

export async function deleteShipment(id) {
  const res = await supabase.from('chuyen_hang').delete().eq('id', id)
  if (res.error) throw res.error
}

export async function getShipmentsDisplay({ status, dateFrom, dateTo } = {}) {
  let query = supabase.from('chuyen_hang').select('*')
  if (status) query = query.eq('trang_thai', status)
  if (dateFrom) query = query.gte('ngay_di', dateFrom)
  if (dateTo) query = query.lte('ngay_di', `${dateTo}T23:59:59`)
  const res = await query.order('ngay_di', { ascending: false })
  if (res.error) throw res.error
  const shipments = res.data
  if (!shipments.length) return []

  const maNvList = [...new Set(shipments.map((s) => s.ma_nv).filter(Boolean))]
  const xeIds = [...new Set(shipments.map((s) => s.id_xe).filter(Boolean))]
  const donViIds = [...new Set([...shipments.map((s) => s.id_don_vi_di), ...shipments.map((s) => s.id_don_vi_den)].filter(Boolean))]

  const [empRes, xeRes, dvRes] = await Promise.all([
    maNvList.length ? supabase.from('nhan_vien').select('"Mã NV", "Họ tên"').in('Mã NV', maNvList) : { data: [] },
    xeIds.length ? supabase.from('xe_bon').select('id, bien_so').in('id', xeIds) : { data: [] },
    donViIds.length ? supabase.from('don_vi').select('id, ten_don_vi').in('id', donViIds) : { data: [] },
  ])
  const empMap = Object.fromEntries((empRes.data || []).map((e) => [e['Mã NV'], e['Họ tên']]))
  const xeMap = Object.fromEntries((xeRes.data || []).map((x) => [x.id, x.bien_so]))
  const dvMap = Object.fromEntries((dvRes.data || []).map((d) => [d.id, d.ten_don_vi]))

  return shipments.map((s) => ({
    id: s.id, maChuyen: s.ma_chuyen, driverMaNv: s.ma_nv, driverName: empMap[s.ma_nv] || s.ma_nv || '',
    plateNumber: xeMap[s.id_xe] || '', diemDi: dvMap[s.id_don_vi_di] || '', diemDen: dvMap[s.id_don_vi_den] || '',
    loaiNhienLieu: s.loai_nhien_lieu || '', soLuongLit: s.so_luong_lit || 0,
    ngayDi: s.ngay_di, status: s.trang_thai, lyDoHuy: s.ly_do_huy,
  }))
}
