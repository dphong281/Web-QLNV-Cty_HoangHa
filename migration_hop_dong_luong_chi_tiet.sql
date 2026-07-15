-- ============================================
-- MIGRATION: Bổ sung "Kết quả đánh giá" thử việc (hop_dong)
-- + tách chi tiết phụ cấp lương theo đúng 14 khoản trong file Excel công ty (ho_so_luong)
-- ============================================

alter table hop_dong
  add column if not exists ket_qua_danh_gia text;
comment on column hop_dong.ket_qua_danh_gia is 'Chỉ áp dụng cho hợp đồng thử việc (loai_hd = ThuViec): Đạt / Không đạt / Chưa đánh giá.';

-- Các khoản có đóng BHXH
alter table ho_so_luong
  add column if not exists phu_cap_chuc_danh text,      -- Phụ cấp chức danh/chức vụ
  add column if not exists phu_cap_trach_nhiem_luong text, -- Phụ cấp trách nhiệm (tách riêng khỏi bảng hợp đồng)
  add column if not exists phu_cap_doc_hai_luong text,   -- Phụ cấp độc hại, nguy hiểm (tách riêng khỏi bảng hợp đồng)
  add column if not exists phu_cap_tham_nien text,
  add column if not exists phu_cap_thu_hut text,
  add column if not exists phu_cap_vung text,
  add column if not exists phu_cap_kiem_nhiem text,
  add column if not exists luong_kpi text,               -- Lương KPI (hiệu quả công việc)
  -- Các khoản không đóng BHXH
  add column if not exists phu_cap_xang_xe text,
  add column if not exists phu_cap_dien_thoai text,
  add column if not exists phu_cap_nha_o text,
  add column if not exists phu_cap_an_ca text,
  add column if not exists phu_cap_dong_phuc text,
  -- Phúc lợi
  add column if not exists phuc_loi_con_nho text;         -- Phúc lợi con nhỏ dưới 6 tuổi

comment on column ho_so_luong.phu_cap_chuc_danh is 'Mã hoá Fernet ở tầng ứng dụng, giống các cột tiền khác trong bảng này.';

-- Ghi chú: cột "phu_cap_co_dinh" cũ vẫn giữ nguyên (không xoá, tránh mất dữ liệu cũ nếu có),
-- nhưng từ nay ứng dụng tính "Tổng phụ cấp" bằng tổng 13 khoản chi tiết ở trên
-- (không cộng thêm phu_cap_co_dinh nữa, để tránh cộng trùng).
-- "Tổng phụ cấp" và "Tổng thu nhập" KHÔNG lưu cột riêng — tính trực tiếp ở phía ứng dụng.
