import { Link } from 'react-router-dom'
import { formatDate } from '../lib/format'
import { Badge, EmptyState } from './ui'

const TRANG_THAI_LABELS = {
  DangHieuLuc: 'Đang hiệu lực', SapHetHan: 'Sắp hết hạn', DaHetHan: 'Đã hết hạn', DaThanhLy: 'Đã thanh lý',
}
const TRANG_THAI_COLORS = {
  DangHieuLuc: 'bg-[var(--color-good)]/10 text-[var(--color-good)]',
  SapHetHan: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  DaHetHan: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
  DaThanhLy: 'bg-black/5 text-[var(--color-text-muted)]',
}

const STAGE_GROUPS = [
  { key: 'thuViec', label: 'Thử việc', cols: ['soHd', 'ngayKy', 'batDau', 'ketThuc', 'trangThai', 'ketQua'] },
  { key: 'lan1', label: 'Xác định thời hạn — Lần 1', cols: ['soHd', 'ngayKy', 'batDau', 'ketThuc', 'trangThai'] },
  { key: 'lan2', label: 'Xác định thời hạn — Lần 2', cols: ['soHd', 'ngayKy', 'batDau', 'ketThuc', 'trangThai'] },
  { key: 'khongXacDinhThoiHan', label: 'Không xác định thời hạn', cols: ['soHd', 'ngayKy', 'batDau', 'trangThai'] },
]
const COL_LABELS = { soHd: 'Mã HĐ', ngayKy: 'Ngày ký', batDau: 'Bắt đầu', ketThuc: 'Kết thúc', trangThai: 'Trạng thái', ketQua: 'Đánh giá' }

function renderCell(contract, col) {
  if (!contract) return <span className="text-[var(--color-text-muted)]">—</span>
  if (col === 'soHd') return contract.so_hd_goc || <span className="text-[var(--color-text-muted)]">—</span>
  if (col === 'ngayKy') return formatDate(contract.ngay_ky)
  if (col === 'batDau') return formatDate(contract.ngay_hieu_luc)
  if (col === 'ketThuc') return contract.ngay_het_han ? formatDate(contract.ngay_het_han) : 'Không XĐ'
  if (col === 'trangThai') return <Badge className={TRANG_THAI_COLORS[contract.trangThaiHienThi]}>{TRANG_THAI_LABELS[contract.trangThaiHienThi]}</Badge>
  if (col === 'ketQua') {
    if (!contract.ket_qua_danh_gia || contract.ket_qua_danh_gia === 'Chưa đánh giá') return <span className="text-[var(--color-text-muted)]">Chưa đánh giá</span>
    return <Badge className={contract.ket_qua_danh_gia === 'Đạt' ? 'bg-[var(--color-good)]/10 text-[var(--color-good)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'}>{contract.ket_qua_danh_gia}</Badge>
  }
  return null
}

export default function ContractHistoryTable({ rows }) {
  if (!rows.length) return <EmptyState title="Chưa có hợp đồng nào" />
  return (
    <div className="overflow-x-auto">
      <table className="text-sm border-collapse">
        <thead>
          <tr className="text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
            <th rowSpan={2} className="px-3 py-2 font-medium sticky left-0 bg-[var(--color-surface)] border-b border-[var(--color-line)] align-bottom">Mã NV</th>
            <th rowSpan={2} className="px-3 py-2 font-medium border-b border-[var(--color-line)] align-bottom whitespace-nowrap">Họ và tên</th>
            <th rowSpan={2} className="px-3 py-2 font-medium border-b border-[var(--color-line)] align-bottom whitespace-nowrap">Bộ phận</th>
            {STAGE_GROUPS.map((g) => (
              <th key={g.key} colSpan={g.cols.length} className="px-3 py-2 font-medium border-b border-l border-[var(--color-line)] text-center whitespace-nowrap">{g.label}</th>
            ))}
          </tr>
          <tr className="text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
            {STAGE_GROUPS.map((g) => g.cols.map((c, i) => (
              <th key={`${g.key}-${c}`} className={`px-3 py-2 font-medium border-b border-[var(--color-line)] whitespace-nowrap ${i === 0 ? 'border-l' : ''}`}>{COL_LABELS[c]}</th>
            )))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.maNv} className="border-b border-[var(--color-line)] last:border-0 hover:bg-black/[0.015]">
              <td className="px-3 py-2.5 font-medium text-[var(--color-ink)] sticky left-0 bg-[var(--color-surface)] whitespace-nowrap">
                <Link to={`/nhan-su?detail=${r.maNv}`} className="hover:underline">{r.maNv}</Link>
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                <Link to={`/nhan-su?detail=${r.maNv}`} className="hover:underline">{r.hoTen}</Link>
              </td>
              <td className="px-3 py-2.5 text-[var(--color-text-muted)] whitespace-nowrap">{r.boPhan}</td>
              {STAGE_GROUPS.map((g) => g.cols.map((c, i) => (
                <td key={`${g.key}-${c}`} className={`px-3 py-2.5 whitespace-nowrap ${i === 0 ? 'border-l border-[var(--color-line)]' : ''}`}>{renderCell(r[g.key], c)}</td>
              )))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
