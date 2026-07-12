-- ============================================
-- MIGRATION: Nhật ký hoạt động cho QLNV
-- Ghi lại mọi lần thêm/sửa/xoá ở các bảng nghiệp vụ chính, ở tầng database
-- (trigger) — không thể lách qua bằng cách sửa code frontend, kể cả thao
-- tác đi qua Edge Function admin-create-user cũng bị ghi lại.
-- ============================================

create table if not exists nhat_ky_hoat_dong (
  id bigint generated always as identity primary key,
  bang text not null,
  hanh_dong text not null,
  ban_ghi_id text,
  nguoi_thuc_hien uuid references auth.users(id),
  ten_nguoi_thuc_hien text,
  du_lieu_truoc jsonb,
  du_lieu_sau jsonb,
  mo_ta text,
  created_at timestamptz default now()
);

create index if not exists idx_nkhd_created on nhat_ky_hoat_dong(created_at desc);
create index if not exists idx_nkhd_bang on nhat_ky_hoat_dong(bang);
create index if not exists idx_nkhd_nguoi on nhat_ky_hoat_dong(nguoi_thuc_hien);

alter table nhat_ky_hoat_dong enable row level security;

drop policy if exists "xem nhat ky" on nhat_ky_hoat_dong;
create policy "xem nhat ky" on nhat_ky_hoat_dong for select using (auth.role() = 'authenticated');

create or replace function fn_ghi_nhat_ky_qlnv()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ten text;
  v_mo_ta text;
  v_ban_ghi_id text;
  v_nhan_dang text := '';
  v_ten_bang text;
begin
  select ho_ten into v_ten from tai_khoan where user_id = auth.uid();

  if tg_table_name = 'nhan_vien' then
    v_ten_bang := 'nhân viên';
    if tg_op = 'DELETE' then
      v_ban_ghi_id := old."Mã NV"; v_nhan_dang := coalesce(old."Họ tên", '');
    else
      v_ban_ghi_id := new."Mã NV"; v_nhan_dang := coalesce(new."Họ tên", '');
    end if;
  elsif tg_table_name = 'hop_dong' then
    v_ten_bang := 'hợp đồng';
    if tg_op = 'DELETE' then
      v_ban_ghi_id := old.ma_hd; v_nhan_dang := coalesce(old.ma_hd, '');
    else
      v_ban_ghi_id := new.ma_hd; v_nhan_dang := coalesce(new.ma_hd, '');
    end if;
  elsif tg_table_name = 'khach_hang' then
    v_ten_bang := 'khách hàng';
    if tg_op = 'DELETE' then
      v_ban_ghi_id := old.ma_kh; v_nhan_dang := coalesce(old.ma_kh, '');
    else
      v_ban_ghi_id := new.ma_kh; v_nhan_dang := coalesce(new.ma_kh, '');
    end if;
  elsif tg_table_name = 'chuyen_hang' then
    v_ten_bang := 'chuyến hàng';
    if tg_op = 'DELETE' then
      v_ban_ghi_id := coalesce(old.ma_chuyen, old.id::text); v_nhan_dang := coalesce(old.ma_chuyen, '');
    else
      v_ban_ghi_id := coalesce(new.ma_chuyen, new.id::text); v_nhan_dang := coalesce(new.ma_chuyen, '');
    end if;
  elsif tg_table_name = 'nhap_xuat_kho' then
    v_ten_bang := 'kho';
    if tg_op = 'DELETE' then v_ban_ghi_id := old.id::text; else v_ban_ghi_id := new.id::text; end if;
  else
    v_ten_bang := tg_table_name;
    if tg_op = 'DELETE' then v_ban_ghi_id := old.id::text; else v_ban_ghi_id := new.id::text; end if;
  end if;

  v_mo_ta := coalesce(v_ten, 'Người dùng đã xoá') || ' ' ||
    (case tg_op
      when 'INSERT' then 'đã thêm'
      when 'UPDATE' then 'đã cập nhật'
      when 'DELETE' then 'đã xoá'
    end) || ' ' || v_ten_bang ||
    (case when v_nhan_dang <> '' then ' "' || v_nhan_dang || '"' else '' end);

  insert into nhat_ky_hoat_dong
    (bang, hanh_dong, ban_ghi_id, nguoi_thuc_hien, ten_nguoi_thuc_hien, du_lieu_truoc, du_lieu_sau, mo_ta)
  values (
    tg_table_name, tg_op, v_ban_ghi_id, auth.uid(), v_ten,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    v_mo_ta
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists trg_log_nhan_vien on nhan_vien;
create trigger trg_log_nhan_vien after insert or update or delete on nhan_vien
  for each row execute function fn_ghi_nhat_ky_qlnv();

drop trigger if exists trg_log_hop_dong on hop_dong;
create trigger trg_log_hop_dong after insert or update or delete on hop_dong
  for each row execute function fn_ghi_nhat_ky_qlnv();

drop trigger if exists trg_log_khach_hang on khach_hang;
create trigger trg_log_khach_hang after insert or update or delete on khach_hang
  for each row execute function fn_ghi_nhat_ky_qlnv();

drop trigger if exists trg_log_chuyen_hang on chuyen_hang;
create trigger trg_log_chuyen_hang after insert or update or delete on chuyen_hang
  for each row execute function fn_ghi_nhat_ky_qlnv();

drop trigger if exists trg_log_nhap_xuat_kho on nhap_xuat_kho;
create trigger trg_log_nhap_xuat_kho after insert or update or delete on nhap_xuat_kho
  for each row execute function fn_ghi_nhat_ky_qlnv();
