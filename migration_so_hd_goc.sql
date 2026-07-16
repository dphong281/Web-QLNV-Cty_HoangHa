-- ============================================
-- MIGRATION: Thêm cột lưu "Số HĐ" gốc trong hồ sơ giấy tờ công ty (không dùng làm khoá chính)
-- Lý do: số HĐ công ty tự đặt tay (VD "015/2021") không đảm bảo DUY NHẤT toàn hệ thống —
-- có thể trùng giữa các nhân viên/bộ phận khác nhau. Khoá chính ma_hd vẫn do hệ thống tự
-- sinh (HD0001, HD0002...) để không bao giờ trùng; số HĐ gốc chỉ lưu để đối chiếu/hiển thị.
-- ============================================

alter table hop_dong
  add column if not exists so_hd_goc text;

comment on column hop_dong.so_hd_goc is 'Số hợp đồng gốc theo cách đánh số thủ công của công ty (VD "015/2021") — chỉ để tham khảo/đối chiếu, KHÔNG phải khoá chính, có thể trùng giữa các nhân viên.';
