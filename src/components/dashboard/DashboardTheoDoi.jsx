import { useEffect, useState } from 'react'
import { getContractWarnings } from '../../lib/contractQueries'
import { formatDate } from '../../lib/format'
import { Card, Badge, LoadingState, ErrorState, EmptyState } from '../ui'

function trangThaiBadge(t) {
  return t === 'DaHetHan'
    ? <Badge className="bg-[var(--color-danger)]/10 text-[var(--color-danger)]">Đã hết hạn</Badge>
    : <Badge className="bg-[var(--color-warning)]/15 text-[var(--color-warning)]">Sắp hết hạn</Badge>
}

function WarningTable({ rows, columns, emptyTitle }) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} />
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide border-b border-[var(--color-line)]">
          {columns.map((c) => <th key={c.key} className="px-4 py-2.5 font-medium">{c.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.maNv} className="border-b border-[var(--color-line)] last:border-0 hover:bg-black/[0.015]">
            {columns.map((c) => (
              <td key={c.key} className="px-4 py-2.5">{c.render ? c.render(r) : r[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function DashboardTheoDoi() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getContractWarnings()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-6">
      <Card>
        <div className="px-5 py-4 border-b border-[var(--color-line)] flex items-center gap-2">
          <h3 className="font-display font-semibold text-[var(--color-ink)]">Thông tin hợp đồng cần xử lý</h3>
          {data.canXuLy.length > 0 && <Badge className="bg-[var(--color-danger)]/10 text-[var(--color-danger)]">{data.canXuLy.length}</Badge>}
        </div>
        <WarningTable
          rows={data.canXuLy}
          emptyTitle="Không có hợp đồng nào cần xử lý"
          columns={[
            { key: 'maNv', label: 'Mã NV' },
            { key: 'hoTen', label: 'Họ và tên' },
            { key: 'boPhan', label: 'Bộ phận' },
            { key: 'loaiHd', label: 'Loại HĐ' },
            { key: 'ngayHetHan', label: 'Ngày hết hạn', render: (r) => formatDate(r.ngayHetHan) },
            { key: 'soNgayConLai', label: 'Số ngày còn lại', render: (r) => r.soNgayConLai < 0 ? `Quá ${-r.soNgayConLai} ngày` : r.soNgayConLai },
            { key: 'trangThaiHienThi', label: 'Trạng thái HĐ', render: (r) => trangThaiBadge(r.trangThaiHienThi) },
          ]}
        />
      </Card>

      <Card>
        <div className="px-5 py-4 border-b border-[var(--color-line)] flex items-center gap-2">
          <h3 className="font-display font-semibold text-[var(--color-ink)]">Thử việc cần đánh giá</h3>
          {data.thuViecCanDanhGia.length > 0 && <Badge className="bg-[var(--color-warning)]/15 text-[var(--color-warning)]">{data.thuViecCanDanhGia.length}</Badge>}
        </div>
        <WarningTable
          rows={data.thuViecCanDanhGia}
          emptyTitle="Không có nhân viên thử việc nào cần đánh giá"
          columns={[
            { key: 'maNv', label: 'Mã NV' },
            { key: 'hoTen', label: 'Họ và tên' },
            { key: 'boPhan', label: 'Bộ phận' },
            { key: 'ngayHetHan', label: 'Kết thúc thử việc', render: (r) => formatDate(r.ngayHetHan) },
            { key: 'soNgayConLai', label: 'Số ngày còn lại', render: (r) => r.soNgayConLai < 0 ? `Quá ${-r.soNgayConLai} ngày` : r.soNgayConLai },
            { key: 'trangThaiHienThi', label: 'Trạng thái TV', render: (r) => trangThaiBadge(r.trangThaiHienThi) },
          ]}
        />
      </Card>
    </div>
  )
}
