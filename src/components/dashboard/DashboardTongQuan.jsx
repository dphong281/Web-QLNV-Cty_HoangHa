import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { getChiSoChungVaCanhBao, getPhanBoVaThieuThongTin } from '../../lib/dashboardQueries'
import { Card, StatCard, Badge, LoadingState, ErrorState, EmptyState } from '../ui'

const BAR_COLORS = ['#2F7A5E', '#0F2A3D', '#E8973A', '#6B7680', '#C0432E']

export default function DashboardTongQuan() {
  const [chiSoChung, setChiSoChung] = useState(null)
  const [canhBaoHd, setCanhBaoHd] = useState(null)
  const [phanBoDonVi, setPhanBoDonVi] = useState([])
  const [phanBoNgach, setPhanBoNgach] = useState([])
  const [thieuThongTin, setThieuThongTin] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      setLoading(true)
      setError(null)
      try {
        const [group1, group2] = await Promise.all([
          getChiSoChungVaCanhBao(),
          getPhanBoVaThieuThongTin(),
        ])
        setChiSoChung(group1.chiSoChung)
        setCanhBaoHd(group1.canhBaoHd)
        setPhanBoDonVi(group2.phanBoDonVi)
        setPhanBoNgach(group2.phanBoNgach)
        setThieuThongTin(group2.thieuThongTin)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const tongCanhBao =
    canhBaoHd.tvSapHet + canhBaoHd.l1SapHet + canhBaoHd.l2SapHet +
    canhBaoHd.tvHetHan + canhBaoHd.l1HetHan + canhBaoHd.l2HetHan

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Tổng CBCNV" value={chiSoChung.tongCbcnv} />
        <StatCard label="Đang làm việc" value={chiSoChung.dangLamViec} />
        <StatCard label="Đang thử việc" value={chiSoChung.dangThuViec} accent />
        <StatCard label="Đã nghỉ việc" value={chiSoChung.daNghiViec} />
        <StatCard label="Nam" value={chiSoChung.nam} sub="Đang làm việc" />
        <StatCard label="Nữ" value={chiSoChung.nu} sub="Đang làm việc" />
      </div>

      <Card className="p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-display font-semibold text-[var(--color-ink)]">Cảnh báo hợp đồng</h3>
          {tongCanhBao > 0 && <Badge className="bg-[var(--color-danger)]/10 text-[var(--color-danger)]">{tongCanhBao} cần xử lý</Badge>}
        </div>
        {tongCanhBao === 0 ? (
          <EmptyState title="Không có hợp đồng nào cần chú ý" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-[var(--color-text-muted)] uppercase mb-2">Sắp hết hạn (≤30 ngày)</div>
              <div className="space-y-1.5">
                <div className="flex justify-between"><span>Thử việc</span><strong className="text-[var(--color-warning)]">{canhBaoHd.tvSapHet}</strong></div>
                <div className="flex justify-between"><span>Xác định thời hạn (Lần 1)</span><strong className="text-[var(--color-warning)]">{canhBaoHd.l1SapHet}</strong></div>
                <div className="flex justify-between"><span>Xác định thời hạn (Lần 2)</span><strong className="text-[var(--color-warning)]">{canhBaoHd.l2SapHet}</strong></div>
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--color-text-muted)] uppercase mb-2">Đã hết hạn</div>
              <div className="space-y-1.5">
                <div className="flex justify-between"><span>Thử việc</span><strong className="text-[var(--color-danger)]">{canhBaoHd.tvHetHan}</strong></div>
                <div className="flex justify-between"><span>Xác định thời hạn (Lần 1)</span><strong className="text-[var(--color-danger)]">{canhBaoHd.l1HetHan}</strong></div>
                <div className="flex justify-between"><span>Xác định thời hạn (Lần 2)</span><strong className="text-[var(--color-danger)]">{canhBaoHd.l2HetHan}</strong></div>
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--color-text-muted)] uppercase mb-2">Nhân viên thiếu thông tin</div>
              <div className="text-2xl font-display font-semibold text-[var(--color-ink)]">{thieuThongTin.length}</div>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <Card className="p-5">
          <h3 className="font-display font-semibold text-[var(--color-ink)] mb-4">Phân bổ theo đơn vị</h3>
          {phanBoDonVi.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={phanBoDonVi}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E0D6" vertical={false} />
                <XAxis dataKey="ten" tick={{ fontSize: 11, fill: '#6B7680' }} axisLine={{ stroke: '#E4E0D6' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7680' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E4E0D6', fontSize: 13 }} />
                <Bar dataKey="soLuong" radius={[6, 6, 0, 0]}>
                  {phanBoDonVi.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-semibold text-[var(--color-ink)] mb-4">Phân bổ theo ngạch</h3>
          {phanBoNgach.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={phanBoNgach}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E0D6" vertical={false} />
                <XAxis dataKey="ten" tick={{ fontSize: 11, fill: '#6B7680' }} axisLine={{ stroke: '#E4E0D6' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7680' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E4E0D6', fontSize: 13 }} />
                <Bar dataKey="soLuong" radius={[6, 6, 0, 0]} fill="var(--color-accent)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {thieuThongTin.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-[var(--color-line)]">
            <h3 className="font-display font-semibold text-[var(--color-ink)]">Nhân viên thiếu thông tin</h3>
          </div>
          <ul className="divide-y divide-[var(--color-line)] max-h-64 overflow-y-auto">
            {thieuThongTin.map((text, i) => (
              <li key={i} className="px-5 py-2.5 text-sm text-[var(--color-text)]">{text}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
