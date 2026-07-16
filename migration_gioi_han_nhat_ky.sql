-- ============================================
-- MIGRATION: Nhật ký hoạt động chỉ giữ 50 dòng gần nhất — dòng cũ hơn tự động xoá.
-- Bảng này được các trigger audit trên nhan_vien/hop_dong/khach_hang/chuyen_hang/
-- nhap_xuat_kho tự ghi vào (không phải app ghi trực tiếp), nên phải dọn ở tầng
-- database mới chắc chắn áp dụng cho mọi nguồn ghi.
-- ============================================

-- Dọn ngay 1 lần cho dữ liệu hiện có, chỉ giữ lại 50 dòng mới nhất
delete from nhat_ky_hoat_dong
where id not in (
  select id from nhat_ky_hoat_dong order by created_at desc limit 50
);

-- Từ nay, sau mỗi lần có dòng mới được thêm vào, tự xoá bớt phần vượt quá 50 dòng
create or replace function trim_nhat_ky_hoat_dong() returns trigger as $$
begin
  delete from nhat_ky_hoat_dong
  where id not in (
    select id from nhat_ky_hoat_dong order by created_at desc limit 50
  );
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_trim_nhat_ky_hoat_dong on nhat_ky_hoat_dong;
create trigger trg_trim_nhat_ky_hoat_dong
after insert on nhat_ky_hoat_dong
for each statement
execute function trim_nhat_ky_hoat_dong();
