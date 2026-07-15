-- ============================================
-- MIGRATION: Lưu chi tiết 14 khoản phụ cấp vào TỪNG KỲ LƯƠNG (bang_luong), không chỉ ở
-- ho_so_luong (đơn giá hiện tại). Để khi xem lại bảng lương tháng cũ, số liệu đúng với
-- thời điểm tính lương đó — không đổi theo nếu sau này sửa đơn giá hiện tại của nhân viên.
-- ============================================

alter table bang_luong
  add column if not exists phu_cap_chuc_danh text,
  add column if not exists phu_cap_trach_nhiem_luong text,
  add column if not exists phu_cap_doc_hai_luong text,
  add column if not exists phu_cap_tham_nien text,
  add column if not exists phu_cap_thu_hut text,
  add column if not exists phu_cap_vung text,
  add column if not exists phu_cap_kiem_nhiem text,
  add column if not exists luong_kpi text,
  add column if not exists phu_cap_xang_xe text,
  add column if not exists phu_cap_dien_thoai text,
  add column if not exists phu_cap_nha_o text,
  add column if not exists phu_cap_an_ca text,
  add column if not exists phu_cap_dong_phuc text,
  add column if not exists phuc_loi_con_nho text;

comment on column bang_luong.phu_cap_chuc_danh is 'Mã hoá Fernet — chụp lại đơn giá tại thời điểm tính lương, không đổi theo ho_so_luong sau này.';
