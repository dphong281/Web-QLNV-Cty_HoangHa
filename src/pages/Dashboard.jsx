import { useState } from 'react'
import { Tabs } from '../components/ui'
import DashboardTongQuan from '../components/dashboard/DashboardTongQuan'
import DashboardTheoDoi from '../components/dashboard/DashboardTheoDoi'
import DashboardSinhNhat from '../components/dashboard/DashboardSinhNhat'
import DashboardBienDong from '../components/dashboard/DashboardBienDong'
import DashboardCoCau from '../components/dashboard/DashboardCoCau'

const TABS = [
  { key: 'tong_quan', label: 'Tổng quan' },
  { key: 'theo_doi', label: 'Theo dõi cảnh báo' },
  { key: 'sinh_nhat', label: 'Sinh nhật' },
  { key: 'bien_dong', label: 'Biến động nhân sự' },
  { key: 'co_cau', label: 'Cơ cấu bộ phận' },
]

export default function Dashboard() {
  const [tab, setTab] = useState('tong_quan')

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">Tổng quan</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Tình hình nhân sự công ty Hoàng Hà</p>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'tong_quan' && <DashboardTongQuan />}
      {tab === 'theo_doi' && <DashboardTheoDoi />}
      {tab === 'sinh_nhat' && <DashboardSinhNhat />}
      {tab === 'bien_dong' && <DashboardBienDong />}
      {tab === 'co_cau' && <DashboardCoCau />}
    </div>
  )
}
