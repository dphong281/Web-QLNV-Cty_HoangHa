-- ============================================
-- MIGRATION: Đảm bảo cai_dat_he_thong.khoa là unique
-- (cần cho upsert từ GitHub Actions backup workflow)
-- An toàn để chạy nhiều lần.
-- ============================================
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cai_dat_he_thong_khoa_key'
  ) then
    alter table cai_dat_he_thong add constraint cai_dat_he_thong_khoa_key unique (khoa);
  end if;
end $$;
