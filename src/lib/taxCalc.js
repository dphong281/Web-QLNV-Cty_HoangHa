import { getValue } from './settingsQueries'

// ---------- Cấu hình (đọc từ cai_dat_he_thong, có mặc định nếu chưa cấu hình) ----------
// Mức hiện hành áp dụng từ 01/07/2026 theo Luật BHXH 2024, Luật Việc làm 2025,
// Nghị định 188/2025/NĐ-CP, Luật Thuế TNCN 2025 (109/2025/QH15) + NQ 110/2025/UBTVQH15.
// Luật thay đổi khá thường xuyên — chỉnh trực tiếp trong Cài đặt, không cần sửa code.
export async function getPayrollConfig() {
  const [luongCoSo, luongToiThieuVung, giamTruBanThan, giamTruNguoiPhuThuoc] = await Promise.all([
    getValue('luong_co_so', 2530000),
    getValue('luong_toi_thieu_vung', 4680000),
    getValue('giam_tru_ban_than', 15500000),
    getValue('giam_tru_nguoi_phu_thuoc', 6200000),
  ])
  return {
    luongCoSo: Number(luongCoSo),
    luongToiThieuVung: Number(luongToiThieuVung),
    giamTruBanThan: Number(giamTruBanThan),
    giamTruNguoiPhuThuoc: Number(giamTruNguoiPhuThuoc),
  }
}

// ---------- BHXH / BHYT / BHTN (phần người lao động) ----------
const TY_LE_BHXH = 0.08
const TY_LE_BHYT = 0.015
const TY_LE_BHTN = 0.01

// luongDongBhxh: "Lương chức danh (đóng BHXH)" — tiền lương làm căn cứ đóng, CHƯA áp trần.
export function tinhBaoHiemNguoiLaoDong(luongDongBhxh, config) {
  const tranBhxhBhyt = 20 * config.luongCoSo
  const tranBhtn = 20 * config.luongToiThieuVung
  const canCuBhxhBhyt = Math.min(luongDongBhxh, tranBhxhBhyt)
  const canCuBhtn = Math.min(luongDongBhxh, tranBhtn)

  const bhxh = Math.round(canCuBhxhBhyt * TY_LE_BHXH)
  const bhyt = Math.round(canCuBhxhBhyt * TY_LE_BHYT)
  const bhtn = Math.round(canCuBhtn * TY_LE_BHTN)
  return { bhxh, bhyt, bhtn, tong: bhxh + bhyt + bhtn }
}

// ---------- Thuế TNCN — biểu luỹ tiến từng phần 5 bậc (Luật Thuế TNCN 2025, áp dụng từ
// kỳ tính thuế 2026) ----------
// Mỗi bậc: [trần thu nhập tính thuế của bậc (Infinity = không giới hạn), thuế suất]
const BAC_THUE = [
  [10_000_000, 0.05],
  [30_000_000, 0.10],
  [60_000_000, 0.20],
  [100_000_000, 0.30],
  [Infinity, 0.35],
]

// thuNhapChiuThue: tổng thu nhập chịu thuế trong tháng (lương + phụ cấp chịu thuế, TRƯỚC khi
// trừ bảo hiểm bắt buộc và giảm trừ gia cảnh — 2 khoản đó trừ ở đây).
// soNguoiPhuThuoc: lấy từ hồ sơ Nhân sự (trường "Số người phụ thuộc").
export function tinhThueTNCN(thuNhapChiuThue, baoHiemNld, soNguoiPhuThuoc, config) {
  const giamTru = config.giamTruBanThan + (Number(soNguoiPhuThuoc) || 0) * config.giamTruNguoiPhuThuoc
  const thuNhapTinhThue = Math.max(0, thuNhapChiuThue - baoHiemNld - giamTru)

  let thue = 0
  let daTinh = 0
  for (const [tran, thueSuat] of BAC_THUE) {
    if (thuNhapTinhThue <= daTinh) break
    const phanTrongBac = Math.min(thuNhapTinhThue, tran) - daTinh
    thue += phanTrongBac * thueSuat
    daTinh = tran
  }
  return { thuNhapTinhThue, thue: Math.round(thue), giamTru }
}
