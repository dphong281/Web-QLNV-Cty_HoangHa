-- ============================================
-- MIGRATION: Khoá đồng thời (concurrency lock) cho QLNV
-- Thêm cột updated_at (nếu chưa có) + trigger tự động cập nhật mỗi khi sửa.
-- ============================================

alter table nhan_vien add column if not exists updated_at timestamptz default now();
alter table hop_dong add column if not exists updated_at timestamptz default now();
alter table khach_hang add column if not exists updated_at timestamptz default now();

create or replace function fn_bump_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_bump_updated_at on nhan_vien;
create trigger trg_bump_updated_at before update on nhan_vien
  for each row execute function fn_bump_updated_at();

drop trigger if exists trg_bump_updated_at on hop_dong;
create trigger trg_bump_updated_at before update on hop_dong
  for each row execute function fn_bump_updated_at();

drop trigger if exists trg_bump_updated_at on khach_hang;
create trigger trg_bump_updated_at before update on khach_hang
  for each row execute function fn_bump_updated_at();
