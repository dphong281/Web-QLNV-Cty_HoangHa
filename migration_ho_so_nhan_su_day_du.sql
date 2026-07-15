-- ============================================
-- MIGRATION: Mở rộng hồ sơ nhân sự đầy đủ (phòng Hành chính quản lý)
-- Chỉ thêm các trường THÔNG TIN CÁ NHÂN mới. Không thêm cột hợp đồng/lương —
-- 2 phần đó tiếp tục lấy từ bảng hop_dong / ho_so_luong sẵn có (module Hợp
-- đồng, Lương), Nhân sự chỉ hiển thị đọc, không nhập trùng.
--
-- Các trường: Tuổi, Thâm niên, Tuổi nghỉ hưu theo luật, Ngày dự kiến nghỉ hưu,
-- Cảnh báo nghỉ hưu, Tỷ lệ hoàn thành hồ sơ... KHÔNG lưu cột riêng — được tính
-- trực tiếp ở phía ứng dụng (src/lib/retirement.js, src/lib/hoSoChecklist.js)
-- từ "Ngày sinh" / "Giới tính" / "Ngày vào Cty" / "Hồ sơ giấy tờ" đã có.
-- ============================================

alter table nhan_vien
  add column if not exists "Mã số thuế" text,
  add column if not exists "Số BHXH" text,
  add column if not exists "Tình trạng hôn nhân" text,
  add column if not exists "Quốc tịch" text default 'Việt Nam',
  add column if not exists "Địa chỉ hiện tại" text,
  add column if not exists "Email công ty" text,
  add column if not exists "Người liên hệ khẩn cấp" text,
  add column if not exists "SĐT khẩn cấp" text,
  add column if not exists "Cấp bậc" text,
  add column if not exists "Quản lý trực tiếp" text,
  add column if not exists "Ngày nghỉ việc" date,
  add column if not exists "Số người phụ thuộc" integer default 0,
  add column if not exists "Số tài khoản" text,
  add column if not exists "Ngân hàng" text,
  add column if not exists "Trình độ" text,
  add column if not exists "Chuyên ngành" text,
  add column if not exists "Hồ sơ giấy tờ" jsonb default '{}'::jsonb,
  add column if not exists "Ghi chú nghỉ hưu" text;

comment on column nhan_vien."Mã số thuế" is 'Mã hoá Fernet ở tầng ứng dụng (giống "Số ĐT") — cột chỉ lưu ciphertext dạng text, không lưu số thật.';
comment on column nhan_vien."Số BHXH" is 'Mã hoá Fernet ở tầng ứng dụng — cột chỉ lưu ciphertext.';
comment on column nhan_vien."Số tài khoản" is 'Mã hoá Fernet ở tầng ứng dụng — cột chỉ lưu ciphertext.';
comment on column nhan_vien."Hồ sơ giấy tờ" is 'Checklist Có/Không các loại giấy tờ, dạng {"key": true/false} — xem src/lib/hoSoChecklist.js cho danh sách key.';
