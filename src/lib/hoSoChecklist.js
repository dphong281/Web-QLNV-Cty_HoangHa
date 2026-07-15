// Checklist giấy tờ hồ sơ nhân viên — chỉ đánh dấu Có/Không (không lưu file thật),
// dùng để tính tỷ lệ hoàn thiện hồ sơ, giống bản desktop.
// Lưu trong cột jsonb "Hồ sơ giấy tờ" của bảng nhan_vien, dạng { [key]: true/false }.

export const HO_SO_CHECKLIST_ITEMS = [
  { key: 'so_yeu_ly_lich', label: 'Sơ yếu lý lịch' },
  { key: 'giay_kham_suc_khoe', label: 'Giấy khám sức khỏe' },
  { key: 'bang_cap_chung_chi', label: 'Bằng cấp, chứng chỉ' },
  { key: 'giay_xac_nhan_cu_tru', label: 'Giấy xác nhận cư trú' },
  { key: 'ly_lich_tu_phap', label: 'Giấy xác nhận dân sự / lý lịch tư pháp' },
  { key: 'ban_sao_cccd', label: 'Bản sao CCCD' },
  { key: 'ban_sao_khai_sinh', label: 'Bản sao giấy khai sinh' },
  { key: 'ban_sao_khai_sinh_con', label: 'Bản sao khai sinh các con' },
  { key: 'so_bhxh', label: 'Sổ BHXH' },
  { key: 'don_xin_viec', label: 'Đơn xin việc' },
  { key: 'anh_3x4', label: 'Ảnh 3x4' },
  { key: 'cam_ket_bao_mat', label: 'Cam kết bảo mật thông tin' },
  { key: 'don_gia_nhap_cong_doan', label: 'Đơn xin gia nhập công đoàn' },
]

export function computeHoSoCompletion(hoSo) {
  const data = hoSo || {}
  const total = HO_SO_CHECKLIST_ITEMS.length
  const done = HO_SO_CHECKLIST_ITEMS.filter((i) => !!data[i.key]).length
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 }
}

export function completionColor(percent) {
  if (percent >= 100) return 'bg-[var(--color-good)]/10 text-[var(--color-good)]'
  if (percent >= 50) return 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
  return 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
}
