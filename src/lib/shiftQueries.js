import { supabase } from './supabase'

export async function getAllDonVi(loaiDonVi) {
  let query = supabase.from('don_vi').select('*').eq('is_active', true)
  if (loaiDonVi) query = query.eq('loai_don_vi', loaiDonVi)
  const res = await query.order('ten_don_vi')
  if (res.error) throw res.error
  return res.data
}

export async function createDonVi(data) {
  const res = await supabase.from('don_vi').insert(data).select().single()
  if (res.error) throw res.error
  return res.data
}

export async function getAllLoaiCa() {
  const res = await supabase.from('loai_ca').select('*').order('gio_bat_dau')
  if (res.error) throw res.error
  return res.data
}

export async function createLoaiCa(data) {
  const res = await supabase.from('loai_ca').insert(data).select().single()
  if (res.error) throw res.error
  return res.data
}

export async function getEmployeesByUnit(unitId) {
  const unitRes = await supabase.from('don_vi').select('ten_don_vi').eq('id', unitId).limit(1)
  if (unitRes.error) throw unitRes.error
  if (!unitRes.data.length) return []
  const tenDonVi = unitRes.data[0].ten_don_vi

  const empRes = await supabase.from('nhan_vien').select('"Mã NV", "Họ tên"')
    .eq('Nơi làm việc', tenDonVi).eq('Trạng thái', 'DangLamViec').order('Mã NV')
  if (empRes.error) throw empRes.error
  return empRes.data.map((e) => ({ maNv: e['Mã NV'], hoTen: e['Họ tên'] }))
}

function toDateStr(d) { return d.toISOString().slice(0, 10) }
function addDays(d, n) { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd }

export async function getWeekSchedule(unitId, weekStart) {
  const employees = await getEmployeesByUnit(unitId)
  const result = {}
  for (const e of employees) result[e.maNv] = { hoTen: e.hoTen, shifts: {} }
  if (!employees.length) return result

  const weekEnd = addDays(weekStart, 6)
  const res = await supabase.from('lich_lam_viec').select('ma_nv, ngay_lam, id_ca')
    .eq('id_don_vi', unitId).gte('ngay_lam', toDateStr(weekStart)).lte('ngay_lam', toDateStr(weekEnd))
  if (res.error) throw res.error
  for (const s of res.data) {
    if (result[s.ma_nv]) result[s.ma_nv].shifts[s.ngay_lam] = s.id_ca
  }
  return result
}

export async function upsertShift(employeeId, workDate, shiftTypeId, unitId) {
  await supabase.from('lich_lam_viec').delete().eq('ma_nv', employeeId).eq('ngay_lam', workDate).eq('id_don_vi', unitId)
  if (shiftTypeId === null) return null
  const res = await supabase.from('lich_lam_viec').insert({ ma_nv: employeeId, ngay_lam: workDate, id_ca: shiftTypeId, id_don_vi: unitId }).select().single()
  if (res.error) throw res.error
  return res.data
}

export async function autoAssignShifts(unitId, weekStart, employeeIds) {
  const loaiCaList = await getAllLoaiCa()
  if (loaiCaList.length < 3) throw new Error('Cần có ít nhất 3 loại ca (Ca 1, Ca 2, Ca 3) trước khi xếp tự động.')
  const shiftIds = loaiCaList.slice(0, 3).map((c) => c.id)
  const weekEnd = addDays(weekStart, 6)

  await supabase.from('lich_lam_viec').delete().eq('id_don_vi', unitId).gte('ngay_lam', toDateStr(weekStart)).lte('ngay_lam', toDateStr(weekEnd))

  const rows = []
  employeeIds.forEach((empId, i) => {
    const offDay = i % 7
    for (let d = 0; d < 7; d++) {
      if (d === offDay) continue
      const workDate = addDays(weekStart, d)
      const shiftId = shiftIds[(i + d) % 3]
      rows.push({ ma_nv: empId, ngay_lam: toDateStr(workDate), id_ca: shiftId, id_don_vi: unitId })
    }
  })
  if (rows.length) {
    const res = await supabase.from('lich_lam_viec').insert(rows)
    if (res.error) throw res.error
  }
  return rows.length
}

export async function copyPreviousWeek(unitId, weekStart) {
  const prevStart = addDays(weekStart, -7)
  const prevEnd = addDays(weekStart, -1)
  const weekEnd = addDays(weekStart, 6)

  const prevRes = await supabase.from('lich_lam_viec').select('ma_nv, ngay_lam, id_ca')
    .eq('id_don_vi', unitId).gte('ngay_lam', toDateStr(prevStart)).lte('ngay_lam', toDateStr(prevEnd))
  if (prevRes.error) throw prevRes.error
  if (!prevRes.data.length) return 0

  await supabase.from('lich_lam_viec').delete().eq('id_don_vi', unitId).gte('ngay_lam', toDateStr(weekStart)).lte('ngay_lam', toDateStr(weekEnd))

  const newRows = prevRes.data.map((r) => ({
    ma_nv: r.ma_nv, ngay_lam: toDateStr(addDays(new Date(r.ngay_lam), 7)), id_ca: r.id_ca, id_don_vi: unitId,
  }))
  const res = await supabase.from('lich_lam_viec').insert(newRows)
  if (res.error) throw res.error
  return newRows.length
}
