import { useState } from 'react'
import { Modal, Input, Select, Textarea, Button, ErrorState, Tabs, Checkbox } from './ui'
import { KHOI_LABELS, TRANG_THAI_NV_LABELS, TINH_TRANG_HON_NHAN_OPTIONS } from '../lib/format'
import { BO_PHAN_OPTIONS, CAP_BAC_OPTIONS, TRINH_DO_OPTIONS, NGAN_HANG_OPTIONS } from '../lib/danhMuc'
import { HO_SO_CHECKLIST_ITEMS, computeHoSoCompletion } from '../lib/hoSoChecklist'

const TABS = [
  { key: 'co_ban', label: 'Cơ bản' },
  { key: 'lien_he', label: 'Liên hệ' },
  { key: 'cong_viec', label: 'Công việc' },
  { key: 'hoc_van_ngan_hang', label: 'Học vấn & Ngân hàng' },
  { key: 'ho_so', label: 'Hồ sơ giấy tờ' },
  { key: 'khac', label: 'Khác' },
]

export default function NhanVienFormModal({ open, onClose, editing, form, setForm, onSubmit, saving, formError }) {
  const [tab, setTab] = useState('co_ban')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const hoSo = form['Hồ sơ giấy tờ'] || {}
  const toggleHoSo = (key) => setForm({ ...form, 'Hồ sơ giấy tờ': { ...hoSo, [key]: !hoSo[key] } })
  const { done, total, percent } = computeHoSoCompletion(hoSo)

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Sửa hồ sơ nhân viên' : 'Thêm nhân viên mới'} size="xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'co_ban' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Mã NV *" required disabled={!!editing} value={form['Mã NV']} onChange={set('Mã NV')} placeholder="VD: HH011" />
              <Input label="Họ tên *" required value={form['Họ tên']} onChange={set('Họ tên')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Ngày sinh" placeholder="dd/mm/yyyy" value={form['Ngày sinh'] || ''} onChange={set('Ngày sinh')} />
              <Select label="Giới tính" value={form['Giới tính']} onChange={set('Giới tính')}>
                <option>Nam</option><option>Nữ</option>
              </Select>
              <Select label="Tình trạng hôn nhân" value={form['Tình trạng hôn nhân'] || ''} onChange={set('Tình trạng hôn nhân')}>
                <option value="">— Chưa rõ —</option>
                {TINH_TRANG_HON_NHAN_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Số CCCD" value={form['Số CCCD'] || ''} onChange={set('Số CCCD')} />
              <Input label="Ngày cấp CCCD" placeholder="dd/mm/yyyy" value={form['Ngày cấp CCCD'] || ''} onChange={set('Ngày cấp CCCD')} />
              <Input label="Nơi cấp" value={form['Nơi cấp'] || ''} onChange={set('Nơi cấp')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Mã số thuế" value={form['Mã số thuế'] || ''} onChange={set('Mã số thuế')} />
              <Input label="Số BHXH" value={form['Số BHXH'] || ''} onChange={set('Số BHXH')} />
              <Input label="Quốc tịch" value={form['Quốc tịch'] || ''} onChange={set('Quốc tịch')} placeholder="Việt Nam" />
            </div>
            <Textarea label="Địa chỉ thường trú" rows={2} value={form['Địa chỉ thường trú'] || ''} onChange={set('Địa chỉ thường trú')} />
            <Textarea label="Địa chỉ hiện tại (nếu khác thường trú)" rows={2} value={form['Địa chỉ hiện tại'] || ''} onChange={set('Địa chỉ hiện tại')} />
          </div>
        )}

        {tab === 'lien_he' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Số điện thoại *" required value={form['Số ĐT']} onChange={set('Số ĐT')} placeholder="10 số, bắt đầu 0" />
              <Input label="Email cá nhân" type="email" value={form['Email'] || ''} onChange={set('Email')} />
            </div>
            <Input label="Email công ty" type="email" value={form['Email công ty'] || ''} onChange={set('Email công ty')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Người liên hệ khẩn cấp" value={form['Người liên hệ khẩn cấp'] || ''} onChange={set('Người liên hệ khẩn cấp')} placeholder="VD: Vợ — Nguyễn Thị B" />
              <Input label="SĐT khẩn cấp" value={form['SĐT khẩn cấp'] || ''} onChange={set('SĐT khẩn cấp')} />
            </div>
          </div>
        )}

        {tab === 'cong_viec' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select label="Khối làm việc" value={form['Khối']} onChange={set('Khối')}>
                {Object.entries(KHOI_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
              <Input label="Chức vụ *" required value={form['Chức vụ']} onChange={set('Chức vụ')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nơi làm việc / Bộ phận *" required list="bo-phan-list" value={form['Nơi làm việc']} onChange={set('Nơi làm việc')} placeholder="Chọn hoặc gõ tên bộ phận" />
              <Input label="Ngạch" value={form['Ngạch'] || ''} onChange={set('Ngạch')} />
            </div>
            <datalist id="bo-phan-list">
              {BO_PHAN_OPTIONS.map((o) => <option key={o} value={o} />)}
            </datalist>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Cấp bậc" list="cap-bac-list" value={form['Cấp bậc'] || ''} onChange={set('Cấp bậc')} placeholder="Chọn hoặc gõ cấp bậc" />
              <Input label="Quản lý trực tiếp" value={form['Quản lý trực tiếp'] || ''} onChange={set('Quản lý trực tiếp')} placeholder="Mã NV hoặc tên quản lý" />
            </div>
            <datalist id="cap-bac-list">
              {CAP_BAC_OPTIONS.map((o) => <option key={o} value={o} />)}
            </datalist>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Ngày vào Cty" type="date" value={form['Ngày vào Cty'] || ''} onChange={set('Ngày vào Cty')} />
              <Input label="Ngày nghỉ việc" type="date" value={form['Ngày nghỉ việc'] || ''} onChange={set('Ngày nghỉ việc')} />
              <Select label="Trạng thái" value={form['Trạng thái']} onChange={set('Trạng thái')}>
                {Object.entries(TRANG_THAI_NV_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </div>
            <Input label="Quyết định đi kèm" value={form['Quyết định đi kèm'] || ''} onChange={set('Quyết định đi kèm')} />
            <div className="rounded-lg bg-black/[0.02] border border-[var(--color-line)] px-4 py-3 text-xs text-[var(--color-text-muted)]">
              Thông tin hợp đồng và lương/phụ cấp được quản lý ở module <b>Hợp đồng</b> và <b>Lương</b> — xem ở phần chi tiết nhân viên, không nhập lại ở đây.
            </div>
          </div>
        )}

        {tab === 'hoc_van_ngan_hang' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Trình độ" list="trinh-do-list" value={form['Trình độ'] || ''} onChange={set('Trình độ')} placeholder="Chọn hoặc gõ trình độ" />
              <Input label="Chuyên ngành" value={form['Chuyên ngành'] || ''} onChange={set('Chuyên ngành')} />
            </div>
            <datalist id="trinh-do-list">
              {TRINH_DO_OPTIONS.map((o) => <option key={o} value={o} />)}
            </datalist>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Số tài khoản" value={form['Số tài khoản'] || ''} onChange={set('Số tài khoản')} />
              <Input label="Ngân hàng" list="ngan-hang-list" value={form['Ngân hàng'] || ''} onChange={set('Ngân hàng')} placeholder="Chọn hoặc gõ ngân hàng" />
            </div>
            <datalist id="ngan-hang-list">
              {NGAN_HANG_OPTIONS.map((o) => <option key={o} value={o} />)}
            </datalist>
            <Input
              label="Số người phụ thuộc"
              type="number" min="0" value={form['Số người phụ thuộc'] ?? 0}
              onChange={(e) => setForm({ ...form, 'Số người phụ thuộc': Number(e.target.value) })}
            />
            <Textarea label="Thông tin học vấn (ghi chú thêm)" rows={2} value={form['Thông tin học vấn'] || ''} onChange={set('Thông tin học vấn')} />
          </div>
        )}

        {tab === 'ho_so' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-muted)]">Đã có {done}/{total} loại giấy tờ</span>
              <span className="text-sm font-medium text-[var(--color-ink)]">{percent}%</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {HO_SO_CHECKLIST_ITEMS.map((item) => (
                <Checkbox key={item.key} label={item.label} checked={!!hoSo[item.key]} onChange={() => toggleHoSo(item.key)} />
              ))}
            </div>
          </div>
        )}

        {tab === 'khac' && (
          <div className="space-y-4">
            <Textarea label="Thông tin gia đình" rows={3} value={form['Thông tin gia đình'] || ''} onChange={set('Thông tin gia đình')} />
            <Textarea label="Ghi chú" rows={2} value={form['Ghi chú'] || ''} onChange={set('Ghi chú')} />
            <Textarea label="Ghi chú nghỉ hưu" rows={2} value={form['Ghi chú nghỉ hưu'] || ''} onChange={set('Ghi chú nghỉ hưu')} />
          </div>
        )}

        {formError && <ErrorState message={formError} />}
        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-line)]">
          <Button type="button" variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button type="submit" variant="accent" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu hệ thống'}</Button>
        </div>
      </form>
    </Modal>
  )
}
