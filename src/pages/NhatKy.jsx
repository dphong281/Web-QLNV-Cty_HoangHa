import { useEffect, useState } from 'react'
import { getNhatKyList, getAllTaiKhoanForFilter } from '../lib/nhatKyQueries'
import { Card, Badge, Select, LoadingState, ErrorState, EmptyState } from '../components/ui'

const HANH_DONG_LABELS = { INSERT: 'Thêm mới', UPDATE: 'Cập nhật', DELETE: 'Xoá' }
const HANH_DONG_COLORS = {
  INSERT: 'bg-[var(--color-good)]/10 text-[var(--color-good)]',
  UPDATE: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  DELETE: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
}
const BANG_LABELS = {
  nhan_vien: 'Nhân sự', hop_dong: 'Hợp đồng', khach_hang: 'Khách hàng',
  chuyen_hang: 'Chuyến hàng', nhap_xuat_kho: 'Kho',
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('vi-VN')
}

export default function NhatKy() {
  const [list, setList] = useState([])
  const [taiKhoans, setTaiKhoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterBang, setFilterBang] = useState('all')
  const [filterHanhDong, setFilterHanhDong] = useState('all')
  const [filterNguoi, setFilterNguoi] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    (async () => {
      setLoading(true)
      setError(null)
      try {
        const [nk, tk] = await Promise.all([getNhatKyList(), getAllTaiKhoanForFilter()])
        setList(nk)
        setTaiKhoans(tk)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = list.filter((item) => {
    if (filterBang !== 'all' && item.bang !== filterBang) return false
    if (filterHanhDong !== 'all' && item.hanh_dong !== filterHanhDong) return false
    if (filterNguoi !== 'all' && item.nguoi_thuc_hien !== filterNguoi) return false
    return true
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">Nhật ký hoạt động</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Ai đã thêm/sửa/xoá gì, lúc nào — ghi tự động ở tầng database</p>
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={filterBang} onChange={(e) => setFilterBang(e.target.value)} className="w-48">
          <option value="all">Tất cả module</option>
          {Object.entries(BANG_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={filterHanhDong} onChange={(e) => setFilterHanhDong(e.target.value)} className="w-44">
          <option value="all">Tất cả hành động</option>
          {Object.entries(HANH_DONG_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={filterNguoi} onChange={(e) => setFilterNguoi(e.target.value)} className="w-52">
          <option value="all">Tất cả người dùng</option>
          {taiKhoans.map((tk) => <option key={tk.user_id} value={tk.user_id}>{tk.ho_ten}</option>)}
        </Select>
      </div>

      <Card>
        {loading ? <LoadingState /> : error ? <div className="p-4"><ErrorState message={error} /></div> : filtered.length === 0 ? (
          <EmptyState title="Chưa có hoạt động nào" />
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {filtered.map((item) => (
              <li key={item.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={HANH_DONG_COLORS[item.hanh_dong]}>{HANH_DONG_LABELS[item.hanh_dong] || item.hanh_dong}</Badge>
                      <Badge className="bg-black/5 text-[var(--color-text-muted)]">{BANG_LABELS[item.bang] || item.bang}</Badge>
                    </div>
                    <div className="text-sm text-[var(--color-ink)] mt-1.5">{item.mo_ta}</div>
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] shrink-0 text-right">{formatDateTime(item.created_at)}</div>
                </div>
                {expandedId === item.id && (item.du_lieu_truoc || item.du_lieu_sau) && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {item.du_lieu_truoc && (
                      <div className="bg-black/[0.02] rounded-lg p-3 overflow-x-auto">
                        <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase mb-1.5">Trước khi thay đổi</div>
                        <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(item.du_lieu_truoc, null, 2)}</pre>
                      </div>
                    )}
                    {item.du_lieu_sau && (
                      <div className="bg-black/[0.02] rounded-lg p-3 overflow-x-auto">
                        <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase mb-1.5">Sau khi thay đổi</div>
                        <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(item.du_lieu_sau, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
