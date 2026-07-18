import { useEffect, useState } from 'react'
import { getCoCauBoPhan } from '../../lib/reportQueries'
import { Card, StatCard, LoadingState, ErrorState } from '../ui'

export default function DashboardCoCau() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getCoCauBoPhan()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const maxSoNv = Math.max(1, ...data.rows.map((r) => r.soNv))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Bộ phận có nhân sự" value={data.tongBoPhanCoNhanSu} />
        <StatCard label="Tổng nhân sự có bộ phận" value={data.tongNhanSuCoBoPhan} accent />
        <StatCard label="Bộ phận trong danh mục" value={data.boPhanTrongDanhMuc} />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide border-b border-[var(--color-line)]">
              <th className="px-4 py-2.5 font-medium w-10 hidden sm:table-cell">STT</th>
              <th className="px-4 py-2.5 font-medium sticky left-0 bg-[var(--color-surface)]">Bộ phận</th>
              <th className="px-4 py-2.5 font-medium">Số NV</th>
              <th className="px-4 py-2.5 font-medium">Tỷ trọng</th>
              <th className="px-4 py-2.5 font-medium w-40 hidden md:table-cell">Biểu đồ nhanh</th>
              <th className="px-4 py-2.5 font-medium hidden md:table-cell">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={r.boPhan} className="border-b border-[var(--color-line)] last:border-0 hover:bg-black/[0.015]">
                <td className="px-4 py-2.5 text-[var(--color-text-muted)] hidden sm:table-cell">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium text-[var(--color-ink)] sticky left-0 bg-[var(--color-surface)] whitespace-nowrap">{r.boPhan}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">{r.soNv}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">{r.tyTrong}%</td>
                <td className="px-4 py-2.5 hidden md:table-cell">
                  <div className="h-2 rounded-full bg-black/5 overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${(r.soNv / maxSoNv) * 100}%` }} />
                  </div>
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text-muted)] hidden md:table-cell">{r.ghiChu || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
