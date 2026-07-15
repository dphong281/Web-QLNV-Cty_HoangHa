import { useEffect, useState } from 'react'
import { getBirthdays } from '../../lib/reportQueries'
import { formatDate } from '../../lib/format'
import { Card, StatCard, LoadingState, ErrorState, EmptyState } from '../ui'

function BirthdayTable({ rows, emptyTitle }) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} />
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide border-b border-[var(--color-line)]">
          <th className="px-4 py-2.5 font-medium">Mã NV</th>
          <th className="px-4 py-2.5 font-medium">Họ và tên</th>
          <th className="px-4 py-2.5 font-medium">Bộ phận</th>
          <th className="px-4 py-2.5 font-medium">Ngày sinh</th>
          <th className="px-4 py-2.5 font-medium">Tuổi</th>
          <th className="px-4 py-2.5 font-medium">SN năm nay</th>
          <th className="px-4 py-2.5 font-medium">Còn lại</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.maNv} className="border-b border-[var(--color-line)] last:border-0 hover:bg-black/[0.015]">
            <td className="px-4 py-2.5 font-medium text-[var(--color-ink)]">{r.maNv}</td>
            <td className="px-4 py-2.5">{r.hoTen}</td>
            <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{r.boPhan}</td>
            <td className="px-4 py-2.5">{formatDate(r.ngaySinh)}</td>
            <td className="px-4 py-2.5">{r.tuoi}</td>
            <td className="px-4 py-2.5">{formatDate(r.snNamNay)}</td>
            <td className="px-4 py-2.5">{r.conLai === 0 ? <strong className="text-[var(--color-accent-dark)]">Hôm nay 🎉</strong> : `${r.conLai} ngày`}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function DashboardSinhNhat() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getBirthdays()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Sinh nhật tháng này" value={data.thangNay.length} accent />
        <StatCard label="Sinh nhật quý này" value={data.quyNay.length} />
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-[var(--color-line)]">
          <h3 className="font-display font-semibold text-[var(--color-ink)]">Sinh nhật trong tháng</h3>
        </div>
        <BirthdayTable rows={data.thangNay} emptyTitle="Không có sinh nhật nào trong tháng này" />
      </Card>

      <Card>
        <div className="px-5 py-4 border-b border-[var(--color-line)]">
          <h3 className="font-display font-semibold text-[var(--color-ink)]">Sinh nhật trong quý</h3>
        </div>
        <BirthdayTable rows={data.quyNay} emptyTitle="Không có sinh nhật nào trong quý này" />
      </Card>
    </div>
  )
}
