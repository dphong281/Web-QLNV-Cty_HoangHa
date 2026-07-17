-- ============================================
-- MIGRATION: Bổ sung khấu trừ BHXH/BHYT/BHTN (phần người lao động) và thuế TNCN vào bảng
-- lương — 2 khoản bắt buộc theo luật mà trước đây CHƯA có, khiến "Thực lãnh" tính thiếu.
-- ============================================

alter table bang_luong
  add column if not exists bhxh_nld text,          -- BHXH người lao động (8%)
  add column if not exists bhyt_nld text,          -- BHYT người lao động (1.5%)
  add column if not exists bhtn_nld text,          -- BHTN người lao động (1%)
  add column if not exists thu_nhap_tinh_thue text, -- Thu nhập tính thuế (sau giảm trừ)
  add column if not exists thue_tncn text;          -- Thuế TNCN phải nộp trong kỳ

comment on column bang_luong.bhxh_nld is 'Mã hoá Fernet — phần BHXH người lao động tự đóng, trích từ Lương chức danh (đóng BHXH), có trần.';
comment on column bang_luong.thue_tncn is 'Mã hoá Fernet — thuế TNCN tạm khấu trừ trong kỳ, tính theo biểu luỹ tiến 5 bậc + giảm trừ gia cảnh hiện hành (xem src/lib/taxCalc.js).';

-- Cấu hình mức đóng/giảm trừ — lưu ở bảng cai_dat_he_thong có sẵn để admin tự cập nhật khi
-- luật thay đổi (không cần sửa code). Giá trị mặc định theo quy định hiện hành từ 01/7/2026.
insert into cai_dat_he_thong (khoa, gia_tri, mo_ta) values
  ('luong_co_so', '2530000', 'Lương cơ sở (đồng/tháng) — dùng tính trần đóng BHXH/BHYT (= 20 lần)'),
  ('luong_toi_thieu_vung', '4680000', 'Lương tối thiểu vùng nơi công ty đóng trụ sở (đồng/tháng) — dùng tính trần đóng BHTN (= 20 lần). Điều chỉnh theo đúng vùng của công ty.'),
  ('giam_tru_ban_than', '15500000', 'Giảm trừ gia cảnh cho bản thân người nộp thuế (đồng/tháng)'),
  ('giam_tru_nguoi_phu_thuoc', '6200000', 'Giảm trừ gia cảnh cho mỗi người phụ thuộc (đồng/tháng)')
on conflict (khoa) do nothing;
