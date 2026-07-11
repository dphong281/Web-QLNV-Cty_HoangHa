import { supabase } from './supabase'
import { encryptValue, decryptValue } from './fernetCrypto'

async function decryptCustomer(c) {
  return {
    ...c,
    ten_khach_hang: await decryptValue(c.ten_khach_hang),
    so_dt: await decryptValue(c.so_dt),
    dia_chi: await decryptValue(c.dia_chi),
    email: await decryptValue(c.email),
  }
}

export async function getAllCustomers({ nhomKh, loaiKh, trangThai, keyword } = {}) {
  let query = supabase.from('khach_hang').select('*')
  if (nhomKh) query = query.eq('nhom_kh', nhomKh)
  if (loaiKh) query = query.eq('loai_kh', loaiKh)
  if (trangThai) query = query.eq('trang_thai', trangThai)
  const res = await query.order('ma_kh')
  if (res.error) throw res.error
  if (!res.data.length) return []

  let customers = await Promise.all(res.data.map(decryptCustomer))

  if (keyword) {
    const kw = keyword.trim().toLowerCase()
    customers = customers.filter((c) =>
      String(c.ma_kh || '').toLowerCase().includes(kw) ||
      String(c.ten_khach_hang || '').toLowerCase().includes(kw) ||
      String(c.so_dt || '').toLowerCase().includes(kw) ||
      String(c.email || '').toLowerCase().includes(kw)
    )
  }

  const maNvList = [...new Set(customers.map((c) => c.ma_nv_phu_trach).filter(Boolean))]
  if (maNvList.length) {
    const nvRes = await supabase.from('nhan_vien').select('"Mã NV", "Họ tên"').in('Mã NV', maNvList)
    const nvMap = Object.fromEntries((nvRes.data || []).map((n) => [n['Mã NV'], n['Họ tên']]))
    customers = customers.map((c) => ({ ...c, tenNvPhuTrach: nvMap[c.ma_nv_phu_trach] || '' }))
  }

  return customers
}

async function generateMaKh() {
  const res = await supabase.from('khach_hang').select('ma_kh').like('ma_kh', 'KH%')
  if (res.error) throw res.error
  return `KH${String(res.data.length + 1).padStart(3, '0')}`
}

export async function createCustomer(data) {
  const maKh = await generateMaKh()
  const payload = {
    ...data, ma_kh: maKh,
    ten_khach_hang: await encryptValue(data.ten_khach_hang),
    so_dt: await encryptValue(data.so_dt),
    dia_chi: await encryptValue(data.dia_chi),
    email: await encryptValue(data.email),
    trang_thai: 'DangGiaoDich',
  }
  const res = await supabase.from('khach_hang').insert(payload).select().single()
  if (res.error) throw res.error
  return decryptCustomer(res.data)
}

export async function updateCustomer(maKh, data) {
  const payload = { ...data }
  if ('ten_khach_hang' in payload) payload.ten_khach_hang = await encryptValue(payload.ten_khach_hang)
  if ('so_dt' in payload) payload.so_dt = await encryptValue(payload.so_dt)
  if ('dia_chi' in payload) payload.dia_chi = await encryptValue(payload.dia_chi)
  if ('email' in payload) payload.email = await encryptValue(payload.email)
  const res = await supabase.from('khach_hang').update(payload).eq('ma_kh', maKh).select().single()
  if (res.error) throw res.error
  return decryptCustomer(res.data)
}

export async function deactivateCustomer(maKh) {
  return updateCustomer(maKh, { trang_thai: 'NgungGiaoDich' })
}

export async function reactivateCustomer(maKh) {
  return updateCustomer(maKh, { trang_thai: 'DangGiaoDich' })
}
