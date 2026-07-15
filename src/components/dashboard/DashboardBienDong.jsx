import { useEffect, useState } from 'react'
import { getBienDongNhanSu } from '../../lib/reportQueries'
import { Card, StatCard, Select, LoadingState, ErrorState } from '../ui'

const CUR_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => CUR_YEAR + 2 - i) // 2 năm tới -> 5 năm trước

function ghiChuColor(g) {
  if (g === 'Ổn định') return 'text-[var(--color-good)]'
  if (g === 'Bình thường') return 'text-[var(--color-text-muted)]'
  if (g === 'Cần chú ý') return 'text-[var(--color-warning)]'
  return 'text-[var(--color-danger)]'
}

export default function DashboardBienDong() {
  const [year, setYear] = useState(CUR_YEAR)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    getBienDongNhanSu(year)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [year])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-[var(--color-ink)]">Năm báo cáo</h3>
        <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-32">
          {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
        </Select>
      </div>

      {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Tổng nhân sự hiện tại" value={data.tongHienTai} />
            <StatCard label={`Tuyển mới ${year}`} value={data.tuyenMoiNam} accent />
            <StatCard label={`Nghỉ việc ${year}`} value={data.nghiViecNam} />
            <StatCard label="Biến động ròng" value={data.bienDongRong > 0 ? `+${data.bienDongRong}` : data.bienDongRong} />
          </div>

          <Card className="overflow-x-auto">
            <div className="px-5 py-4 border-b border-[var(--color-line)]">
              <h3 className="font-display font-semibold text-[var(--color-ink)]">Theo tháng — {year}</h3>
            </div>
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide border-b border-[var(--color-line)]">
                  <th className="px-3 py-2.5 font-medium sticky left-0 bg-[var(--color-surface)]">Chỉ tiêu</th>
                  {data.monthly.map((m) => <th key={m.thang} className="px-3 py-2.5 font-medium text-center">Th.{m.thang}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Nhân sự đầu tháng', 'dauThang'],
                  ['Tuyển mới', 'tuyenMoi'],
                  ['Nghỉ việc', 'nghiViec'],
                  ['Biến động ròng', 'bienDongRong'],
                  ['Nhân sự cuối tháng', 'cuoiThang'],
                ].map(([label, key]) => (
                  <tr key={key} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="px-3 py-2 font-medium text-[var(--color-ink)] sticky left-0 bg-[var(--color-surface)]">{label}</td>
                    {data.monthly.map((m) => <td key={m.thang} className="px-3 py-2 text-center">{m[key]}</td>)}
                  </tr>
                ))}
                <tr className="border-b border-[var(--color-line)] last:border-0">
                  <td className="px-3 py-2 font-medium text-[var(--color-ink)] sticky left-0 bg-[var(--color-surface)]">Tỷ lệ nghỉ việc</td>
                  {data.monthly.map((m) => <td key={m.thang} className="px-3 py-2 text-center">{m.tyLe}%</td>)}
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-[var(--color-ink)] sticky left-0 bg-[var(--color-surface)]">Ghi chú</td>
                  {data.monthly.map((m) => <td key={m.thang} className={`px-3 py-2 text-center text-xs ${ghiChuColor(m.ghiChu)}`}>{m.ghiChu}</td>)}
                </tr>
              </tbody>
            </table>
          </Card>

          <Card className="overflow-x-auto">
            <div className="px-5 py-4 border-b border-[var(--color-line)]">
              <h3 className="font-display font-semibold text-[var(--color-ink)]">Theo năm (5 năm gần nhất)</h3>
            </div>
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide border-b border-[var(--color-line)]">
                  <th className="px-3 py-2.5 font-medium">Chỉ tiêu</th>
                  {data.yearly.map((y) => <th key={y.nam} className="px-3 py-2.5 font-medium text-center">{y.nam}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Nhân sự đầu năm', 'dauNam'],
                  ['Tuyển mới', 'tuyenMoi'],
                  ['Nghỉ việc', 'nghiViec'],
                  ['Biến động ròng', 'bienDongRong'],
                  ['Nhân sự cuối năm', 'cuoiNam'],
                  ['Nhân sự bình quân', 'binhQuan'],
                ].map(([label, key]) => (
                  <tr key={key} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="px-3 py-2 font-medium text-[var(--color-ink)]">{label}</td>
                    {data.yearly.map((y) => <td key={y.nam} className="px-3 py-2 text-center">{y[key]}</td>)}
                  </tr>
                ))}
                <tr>
                  <td className="px-3 py-2 font-medium text-[var(--color-ink)]">Tỷ lệ nghỉ việc</td>
                  {data.yearly.map((y) => <td key={y.nam} className="px-3 py-2 text-center">{y.tyLe}%</td>)}
                </tr>
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
