import { supabase } from './supabase'
import { getValue } from './settingsQueries'

function toDateStr(d) { return d.toISOString().slice(0, 10) }

export async function importRawLogs(rows, sourceName) {
  const payload = []
  for (const r of rows) {
    if (r.checkIn) payload.push({ ma_nv: r.maNv, thoi_gian: `${r.logDate}T${r.checkIn}:00`, loai: 'VaoCa', nguon: sourceName })
    if (r.checkOut) payload.push({ ma_nv: r.maNv, thoi_gian: `${r.logDate}T${r.checkOut}:00`, loai: 'RaCa', nguon: sourceName })
  }
  if (!payload.length) return 0
  const res = await supabase.from('log_cham_cong_tho').insert(payload)
  if (res.error) throw res.error
  return payload.length
}

function minutesDiff(t1, t2) {
  const toMinutes = (t) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  return toMinutes(t1) - toMinutes(t2)
}

export async function reconcileDay(ngay) {
  const ngayStr = toDateStr(ngay)

  const shiftsRes = await supabase.from('lich_lam_viec').select('ma_nv, id_ca').eq('ngay_lam', ngayStr)
  if (shiftsRes.error) throw shiftsRes.error
  const shifts = shiftsRes.data
  if (!shifts.length) return 0

  const caIds = [...new Set(shifts.map((s) => s.id_ca).filter(Boolean))]
  const caRes = await supabase.from('loai_ca').select('id, gio_bat_dau, gio_ket_thuc').in('id', caIds)
  if (caRes.error) throw caRes.error
  const caMap = Object.fromEntries(caRes.data.map((c) => [c.id, c]))

  const maNvList = [...new Set(shifts.map((s) => s.ma_nv))]
  const logsRes = await supabase.from('log_cham_cong_tho').select('ma_nv, thoi_gian, loai')
    .gte('thoi_gian', `${ngayStr}T00:00:00`).lte('thoi_gian', `${ngayStr}T23:59:59`).in('ma_nv', maNvList)
  if (logsRes.error) throw logsRes.error
  const logsByNv = {}
  for (const l of logsRes.data) {
    if (!logsByNv[l.ma_nv]) logsByNv[l.ma_nv] = []
    logsByNv[l.ma_nv].push(l)
  }

  const lateThreshold = Number(await getValue('cham_cong_nguong_di_muon_phut', '15')) || 15
  const earlyThreshold = Number(await getValue('cham_cong_nguong_ve_som_phut', '15')) || 15

  const rowsToUpsert = []
  for (const s of shifts) {
    const maNv = s.ma_nv
    const ca = caMap[s.id_ca]
    const employeeLogs = logsByNv[maNv] || []

    if (!employeeLogs.length) {
      rowsToUpsert.push({ ma_nv: maNv, ngay: ngayStr, gio_vao: null, gio_ra: null, trang_thai: 'TuYBoCa', ot_gio: 0 })
      continue
    }

    const timesIn = employeeLogs.filter((l) => l.loai === 'VaoCa').map((l) => new Date(l.thoi_gian))
    const timesOut = employeeLogs.filter((l) => l.loai === 'RaCa').map((l) => new Date(l.thoi_gian))
    const gioVao = timesIn.length ? new Date(Math.min(...timesIn)) : null
    const gioRa = timesOut.length ? new Date(Math.max(...timesOut)) : null

    let trangThai = 'DungGio'
    let otGio = 0
    const fmtTime = (d) => d.toTimeString().slice(0, 8)

    if (ca && gioVao) {
      if (minutesDiff(fmtTime(gioVao), ca.gio_bat_dau) > lateThreshold) trangThai = 'DiMuon'
    }
    if (ca && gioRa) {
      const diffEnd = minutesDiff(ca.gio_ket_thuc, fmtTime(gioRa))
      if (diffEnd > earlyThreshold) {
        trangThai = trangThai === 'DungGio' ? 'VeSom' : trangThai
      } else if (fmtTime(gioRa) > ca.gio_ket_thuc) {
        const [eh, em, es] = ca.gio_ket_thuc.split(':').map(Number)
        const caEndDate = new Date(gioRa); caEndDate.setHours(eh, em, es || 0, 0)
        otGio = Math.round(((gioRa - caEndDate) / 3600000) * 100) / 100
        if (trangThai === 'DungGio') trangThai = 'OT'
      }
    }
    if (!gioVao && !gioRa) trangThai = 'TuYBoCa'

    rowsToUpsert.push({
      ma_nv: maNv, ngay: ngayStr,
      gio_vao: gioVao ? fmtTime(gioVao) : null,
      gio_ra: gioRa ? fmtTime(gioRa) : null,
      trang_thai: trangThai, ot_gio: otGio,
    })
  }

  if (rowsToUpsert.length) {
    const res = await supabase.from('cham_cong').upsert(rowsToUpsert, { onConflict: 'ma_nv,ngay' })
    if (res.error) throw res.error
  }
  return rowsToUpsert.length
}

export async function reconcileRange(dateFrom, dateTo) {
  let total = 0
  const current = new Date(dateFrom)
  const end = new Date(dateTo)
  while (current <= end) {
    total += await reconcileDay(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return total
}

export async function getTimekeepingSummary(dateFrom, dateTo, status) {
  let query = supabase.from('cham_cong').select('*').gte('ngay', dateFrom).lte('ngay', dateTo)
  if (status) query = query.eq('trang_thai', status)
  const res = await query.order('ngay', { ascending: false })
  if (res.error) throw res.error
  if (!res.data.length) return []

  const maNvList = [...new Set(res.data.map((r) => r.ma_nv))]
  const empRes = await supabase.from('nhan_vien').select('"Mã NV", "Họ tên", "Nơi làm việc"').in('Mã NV', maNvList)
  if (empRes.error) throw empRes.error
  const empMap = Object.fromEntries(empRes.data.map((e) => [e['Mã NV'], e]))

  return res.data.map((r) => {
    const emp = empMap[r.ma_nv] || {}
    return {
      id: r.id, maNv: r.ma_nv, hoTen: emp['Họ tên'] || '', noiLamViec: emp['Nơi làm việc'] || '',
      ngay: r.ngay, gioVao: r.gio_vao, gioRa: r.gio_ra, trangThai: r.trang_thai, otGio: r.ot_gio || 0,
    }
  })
}

export async function deleteTimekeepingRecord(id) {
  const res = await supabase.from('cham_cong').delete().eq('id', id)
  if (res.error) throw res.error
}
