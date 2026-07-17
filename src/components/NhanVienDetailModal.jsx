import { useEffect, useState } from 'react'
import { Modal, Button, Badge } from './ui'
import { formatDate, formatCurrency, TRANG_THAI_HD_LABELS } from '../lib/format'
import { getContractHistoryByNv } from '../lib/contractQueries'
import { getHoSoLuong, tinhTongPhuCap, tinhTongThuNhap } from '../lib/payrollQueries'
import { getAge, getSeniorityYears, getRetirementAgeLabel, getRetirementCountdown, getRetirementWarning } from '../lib/retirement'
import { computeHoSoCompletion, completionColor } from '../lib/hoSoChecklist'

function Field({ label, children }) {
  return (
    <div>
      <span className="text-[var(--color-text-muted)]">{label}:</span> {children ?? '—'}
    </div>
  )
}

export default function NhanVienDetailModal({ detail, onClose, onEdit }) {
  const [history, setHistory] = useState(null)
  const [salary, setSalary] = useState(null)
  const [loadingExtra, setLoadingExtra] = useState(false)

  useEffect(() => {
    if (!detail) { setHistory(null); setSalary(null); return }
    setLoadingExtra(true)
    Promise.all([
      getContractHistoryByNv(detail['Mã NV']).catch(() => null),
      getHoSoLuong(detail['Mã NV']).catch(() => null),
    ]).then(([h, s]) => { setHistory(h); setSalary(s) }).finally(() => setLoadingExtra(false))
  }, [detail])

  if (!detail) return null

  const hoSo = detail['Hồ sơ giấy tờ'] || {}
  const { done, total, percent } = computeHoSoCompletion(hoSo)
  const age = getAge(detail['Ngày sinh'])
  const seniority = getSeniorityYears(detail['Ngày vào Cty'], detail['Ngày nghỉ việc'])
  const retirementAge = getRetirementAgeLabel(detail['Ngày sinh'], detail['Giới tính'])
  const countdown = getRetirementCountdown(detail['Ngày sinh'], detail['Giới tính'])
  const warning = getRetirementWarning(detail['Ngày sinh'], detail['Giới tính'])

  return (
    <Modal open={!!detail} onClose={onClose} title={`${detail['Mã NV']} — ${detail['Họ tên']}`} size="xl">
      <div className="space-y-6 text-sm">
        {warning && (
          <div className={`rounded-lg px-4 py-2.5 text-sm font-medium ${warning.level === 'danger' ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]' : 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]'}`}>
            ⚠ {warning.text}
          </div>
        )}

        <section>
          <h4 className="font-display font-semibold text-[var(--color-ink)] mb-2">Thông tin cá nhân</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <Field label="Ngày sinh">{formatDate(detail['Ngày sinh'])}{age != null ? ` (${age} tuổi)` : ''}</Field>
            <Field label="Giới tính">{detail['Giới tính']}</Field>
            <Field label="Tình trạng hôn nhân">{detail['Tình trạng hôn nhân']}</Field>
            <Field label="Quốc tịch">{detail['Quốc tịch']}</Field>
            <Field label="Số CCCD">{detail['Số CCCD']}</Field>
            <Field label="Ngày/nơi cấp">{detail['Ngày cấp CCCD'] ? `${formatDate(detail['Ngày cấp CCCD'])} — ${detail['Nơi cấp'] || '—'}` : null}</Field>
            <Field label="Mã số thuế">{detail['Mã số thuế']}</Field>
            <Field label="Số BHXH">{detail['Số BHXH']}</Field>
            <div className="col-span-2"><Field label="Địa chỉ thường trú">{detail['Địa chỉ thường trú']}</Field></div>
            {detail['Địa chỉ hiện tại'] && <div className="col-span-2"><Field label="Địa chỉ hiện tại">{detail['Địa chỉ hiện tại']}</Field></div>}
          </div>
        </section>

        <section>
          <h4 className="font-display font-semibold text-[var(--color-ink)] mb-2">Liên hệ</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <Field label="SĐT">{detail['Số ĐT']}</Field>
            <Field label="Email cá nhân">{detail['Email']}</Field>
            <Field label="Email công ty">{detail['Email công ty']}</Field>
            <Field label="Liên hệ khẩn cấp">{detail['Người liên hệ khẩn cấp']}{detail['SĐT khẩn cấp'] ? ` — ${detail['SĐT khẩn cấp']}` : ''}</Field>
          </div>
        </section>

        <section>
          <h4 className="font-display font-semibold text-[var(--color-ink)] mb-2">Công việc</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <Field label="Chức vụ / Cấp bậc">{detail['Chức vụ']}{detail['Cấp bậc'] ? ` — ${detail['Cấp bậc']}` : ''}</Field>
            <Field label="Nơi làm việc">{detail['Nơi làm việc']}</Field>
            <Field label="Ngạch">{detail['Ngạch']}</Field>
            <Field label="Quản lý trực tiếp">{detail['Quản lý trực tiếp']}</Field>
            <Field label="Ngày vào Cty">{formatDate(detail['Ngày vào Cty'])}{seniority != null ? ` (${seniority} năm)` : ''}</Field>
            <Field label="Ngày nghỉ việc">{detail['Ngày nghỉ việc'] ? formatDate(detail['Ngày nghỉ việc']) : null}</Field>
            <Field label="Quyết định đi kèm">{detail['Quyết định đi kèm']}</Field>
          </div>
        </section>

        <section>
          <h4 className="font-display font-semibold text-[var(--color-ink)] mb-2">
            Hợp đồng <span className="text-xs font-normal text-[var(--color-text-muted)]">(đọc từ module Hợp đồng, không nhập lại ở đây)</span>
          </h4>
          {loadingExtra ? (
            <div className="text-[var(--color-text-muted)]">Đang tải...</div>
          ) : (
            <div className="space-y-2">
              {[
                ['thuViec', 'Thử việc'],
                ['lan1', 'Xác định thời hạn — Lần 1'],
                ['lan2', 'Xác định thời hạn — Lần 2'],
                ['khongXacDinhThoiHan', 'Không xác định thời hạn'],
              ].map(([key, label]) => {
                const c = history?.[key]
                return (
                  <div key={key} className="flex items-center justify-between text-sm border-b border-[var(--color-line)] last:border-0 pb-2 last:pb-0">
                    <span className="text-[var(--color-text-muted)] w-56 shrink-0">{label}</span>
                    {c ? (
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span>{c.ma_hd} — ký {formatDate(c.ngay_ky)}, hiệu lực {formatDate(c.ngay_hieu_luc)}{c.ngay_het_han ? ` → ${formatDate(c.ngay_het_han)}` : ' (không XĐ)'}</span>
                        <Badge className="bg-black/5">{TRANG_THAI_HD_LABELS[c.trangThaiHienThi] || c.trangThaiHienThi}</Badge>
                        {key === 'thuViec' && c.ket_qua_danh_gia && c.ket_qua_danh_gia !== 'Chưa đánh giá' && (
                          <Badge className={c.ket_qua_danh_gia === 'Đạt' ? 'bg-[var(--color-good)]/10 text-[var(--color-good)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'}>{c.ket_qua_danh_gia}</Badge>
                        )}
                      </div>
                    ) : <span className="text-[var(--color-text-muted)]">—</span>}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <h4 className="font-display font-semibold text-[var(--color-ink)] mb-2">
            Lương &amp; phụ cấp <span className="text-xs font-normal text-[var(--color-text-muted)]">(đọc từ module Lương, không nhập lại ở đây)</span>
          </h4>
          {loadingExtra ? (
            <div className="text-[var(--color-text-muted)]">Đang tải...</div>
          ) : salary ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <Field label="Lương chức danh (Lương CB, đóng BHXH)">{formatCurrency(salary.luong_co_ban)}</Field>
              <Field label="Tổng phụ cấp">{formatCurrency(tinhTongPhuCap(salary))}</Field>
              <Field label="Tổng thu nhập">{formatCurrency(tinhTongThuNhap(salary))}</Field>
            </div>
          ) : <div className="text-[var(--color-text-muted)]">Chưa khai báo lương.</div>}
        </section>

        <section>
          <h4 className="font-display font-semibold text-[var(--color-ink)] mb-2">Học vấn &amp; Ngân hàng</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <Field label="Trình độ / Chuyên ngành">{detail['Trình độ'] ? `${detail['Trình độ']}${detail['Chuyên ngành'] ? ' — ' + detail['Chuyên ngành'] : ''}` : null}</Field>
            <Field label="Số người phụ thuộc">{detail['Số người phụ thuộc']}</Field>
            <Field label="Tài khoản ngân hàng">{detail['Số tài khoản'] ? `${detail['Số tài khoản']} — ${detail['Ngân hàng'] || '—'}` : null}</Field>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-display font-semibold text-[var(--color-ink)]">Hồ sơ giấy tờ</h4>
            <Badge className={completionColor(percent)}>{done}/{total} — {percent}%</Badge>
          </div>
        </section>

        <section>
          <h4 className="font-display font-semibold text-[var(--color-ink)] mb-2">Nghỉ hưu (tham khảo theo luật)</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <Field label="Tuổi nghỉ hưu theo luật">{retirementAge}</Field>
            <Field label="Ngày dự kiến nghỉ hưu">{countdown ? formatDate(countdown.date) : null}</Field>
            <Field label="Còn lại đến nghỉ hưu">
              {countdown ? (countdown.isPast ? 'Đã quá hạn' : `${countdown.years} năm ${countdown.months} tháng (${countdown.days} ngày)`) : null}
            </Field>
          </div>
          {detail['Ghi chú nghỉ hưu'] && <div className="mt-2"><Field label="Ghi chú nghỉ hưu">{detail['Ghi chú nghỉ hưu']}</Field></div>}
        </section>

        {(detail['Ghi chú'] || detail['Thông tin học vấn'] || detail['Thông tin gia đình']) && (
          <section>
            <h4 className="font-display font-semibold text-[var(--color-ink)] mb-2">Khác</h4>
            {detail['Thông tin học vấn'] && <div className="mb-1"><Field label="Học vấn (ghi chú)">{detail['Thông tin học vấn']}</Field></div>}
            {detail['Thông tin gia đình'] && <div className="mb-1"><Field label="Gia đình">{detail['Thông tin gia đình']}</Field></div>}
            {detail['Ghi chú'] && <div><Field label="Ghi chú">{detail['Ghi chú']}</Field></div>}
          </section>
        )}

        <div className="pt-2 border-t border-[var(--color-line)]">
          <Button variant="ghost" onClick={() => onEdit(detail)}>Sửa thông tin</Button>
        </div>
      </div>
    </Modal>
  )
}
