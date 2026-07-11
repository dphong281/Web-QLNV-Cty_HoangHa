import { useEffect, useState } from 'react'
import {
  getAllDonVi, getAllLoaiCa, getWeekSchedule, upsertShift, autoAssignShifts, copyPreviousWeek,
} from '../lib/shiftQueries'
import { Card, Button, Select, LoadingState, ErrorState, EmptyState } from '../components/ui'

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}
function toDateStr(d) { return d.toISOString().slice(0, 10) }
function addDays(d, n) { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd }

export default function CaKip() {
  const [donViList, setDonViList] = useState([])
  const [loaiCaList, setLoaiCaList] = useState([])
  const [unitId, setUnitId] = useState('')
  const [weekStart, setWeekStart] = useState(getMonday(new Date()))
  const [schedule, setSchedule] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const [dv, lc] = await Promise.all([getAllDonVi(), getAllLoaiCa()])
        setDonViList(dv)
        setLoaiCaList(lc)
        if (dv.length) setUnitId(dv[0].id)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (!unitId) return
    loadSchedule()
  }, [unitId, weekStart])

  async function loadSchedule() {
    setLoading(true)
    setError(null)
    try {
      setSchedule(await getWeekSchedule(unitId, weekStart))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCellClick(maNv, dateStr, currentCaId) {
    const options = [null, ...loaiCaList.map((c) => c.id)]
    const idx = options.indexOf(currentCaId ?? null)
    const nextCaId = options[(idx + 1) % options.length]
    try {
      await upsertShift(maNv, dateStr, nextCaId, unitId)
      loadSchedule()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
  }

  async function handleAutoAssign() {
    if (!confirm('Xếp ca tự động sẽ GHI ĐÈ toàn bộ lịch tuần này của đơn vị đang chọn. Tiếp tục?')) return
    setBusy(true)
    try {
      const employeeIds = Object.keys(schedule)
      const count = await autoAssignShifts(unitId, weekStart, employeeIds)
      alert(`Đã xếp ${count} ca.`)
      loadSchedule()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleCopyPrevious() {
    if (!confirm('Sao chép lịch tuần trước sẽ GHI ĐÈ lịch tuần này. Tiếp tục?')) return
    setBusy(true)
    try {
      const count = await copyPreviousWeek(unitId, weekStart)
      alert(`Đã sao chép ${count} ca.`)
      loadSchedule()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const caMap = Object.fromEntries(loaiCaList.map((c) => [c.id, c]))
  const employees = Object.entries(schedule)

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">Ca kíp</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Lịch làm việc theo tuần — bấm vào ô để đổi ca (xoay vòng: Off → Ca 1 → Ca 2 → Ca 3)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleCopyPrevious} disabled={busy}>Sao chép tuần trước</Button>
          <Button variant="accent" onClick={handleAutoAssign} disabled={busy}>Xếp ca tự động</Button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Select value={unitId} onChange={(e) => setUnitId(e.target.value)} className="max-w-xs">
          {donViList.map((d) => <option key={d.id} value={d.id}>{d.ten_don_vi}</option>)}
        </Select>
        <Button variant="ghost" onClick={() => setWeekStart(addDays(weekStart, -7))}>← Tuần trước</Button>
        <span className="text-sm font-medium text-[var(--color-ink)]">
          {toDateStr(weekStart)} → {toDateStr(addDays(weekStart, 6))}
        </span>
        <Button variant="ghost" onClick={() => setWeekStart(addDays(weekStart, 7))}>Tuần sau →</Button>
      </div>

      <Card>
        {loading ? <LoadingState /> : error ? <div className="p-4"><ErrorState message={error} /></div> : !donViList.length ? (
          <EmptyState title="Chưa có đơn vị nào" sub="Cần tạo đơn vị (cây xăng/kho...) trước ở Cài đặt." />
        ) : employees.length === 0 ? (
          <EmptyState title="Đơn vị này chưa có nhân viên" sub="Nhân viên cần có 'Nơi làm việc' trùng tên đơn vị." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide border-b border-[var(--color-line)]">
                  <th className="px-4 py-3 font-medium sticky left-0 bg-white">Nhân viên</th>
                  {days.map((d) => (
                    <th key={toDateStr(d)} className="px-2 py-3 font-medium text-center min-w-[90px]">
                      {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()]}<br />{d.getDate()}/{d.getMonth() + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(([maNv, info]) => (
                  <tr key={maNv} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="px-4 py-2.5 font-medium text-[var(--color-ink)] sticky left-0 bg-white whitespace-nowrap">{info.hoTen}</td>
                    {days.map((d) => {
                      const dateStr = toDateStr(d)
                      const caId = info.shifts[dateStr]
                      const ca = caMap[caId]
                      return (
                        <td key={dateStr} className="px-1 py-2 text-center">
                          <button
                            onClick={() => handleCellClick(maNv, dateStr, caId)}
                            className={`w-full py-1.5 rounded-md text-xs font-medium ${ca ? (ca.is_night ? 'bg-[var(--color-ink)]/10 text-[var(--color-ink)]' : 'bg-[var(--color-accent)]/12 text-[var(--color-accent-dark)]') : 'bg-black/[0.02] text-[var(--color-text-muted)]'}`}
                          >
                            {ca ? ca.ten_ca : 'Off'}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
