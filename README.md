# QLNV Web — Quản lý Nhân sự Hoàng Hà

Chuyển đổi toàn bộ từ app desktop CustomTkinter sang web. Dùng lại **đúng** Supabase project hiện có — dữ liệu ~1000 nhân viên, hợp đồng, tài khoản... giữ nguyên, không mất gì.

Stack: React + Vite + Tailwind CSS v4 + Supabase (Auth + DB) + Recharts.

---

## 1. Cài đặt

```bash
npm install
```

Đổi tên `.env.example` → `.env`, điền (lấy từ `config.py` trong repo desktop cũ):
```
VITE_SUPABASE_URL=https://ggfbimkbgbmltmocjrhw.supabase.co
VITE_SUPABASE_ANON_KEY=(dòng SUPABASE_KEY trong config.py)
VITE_ENCRYPTION_KEY=(dòng ENCRYPTION_KEY trong config.py)
```

```bash
npm run dev
```

Đăng nhập bằng đúng tài khoản đang dùng trên app desktop.

---

## 2. Đã hoàn thành — toàn bộ 10 module

| Module | Route | Ghi chú |
|---|---|---|
| Tổng quan (Dashboard) | `/` | Y hệt bản desktop: chỉ số chung, cảnh báo hợp đồng, phân bổ đơn vị/ngạch, thiếu thông tin |
| Nhân sự | `/nhan-su` | CRUD đầy đủ, validate y hệt desktop, **Nhập/Xuất Excel** (tự nhận diện cột dù xáo trộn thứ tự, dò dòng tiêu đề thật trong 15 dòng đầu) |
| Hợp đồng | `/hop-dong` | Tự sinh mã HĐ, tự đếm Lần 1/Lần 2, chặn ký lần 3, đồng bộ sang hồ sơ lương, **Xuất Excel hợp đồng sắp hết hạn** |
| Ca kíp | `/ca-kip` | Lịch tuần, bấm ô đổi ca, xếp tự động, sao chép tuần trước |
| Chấm công | `/cham-cong` | **Nhập Excel log ra/vào ca** (tự nhận diện cột), đối soát 1 ngày **hoặc cả khoảng ngày** (nâng cấp so với desktop chỉ đối soát từng ngày) |
| Lương | `/luong` | Tính lương tự động, **xem trước danh sách NV khi chưa tính**, chốt kỳ lương, **Xuất Excel bảng lương** |
| Chuyến hàng | `/chuyen-hang` | Chỉ hiện tài xế đang rảnh, tự sinh mã chuyến |
| Kho | `/kho` | Nhập/xuất kho theo đơn vị |
| Khách hàng | `/khach-hang` | CRUD, mã hoá SĐT/địa chỉ/tên/email |
| Tài khoản | `/tai-khoan` | Dùng lại Edge Function `admin-create-user` có sẵn — phân quyền Admin/Trưởng phòng y hệt desktop |
| Cài đặt | `/cai-dat` | Quản lý đơn vị, loại ca, ngưỡng đi muộn/về sớm |

## Về tính năng nhập Excel — đã nâng cấp so với bản desktop

Bản desktop chỉ nhận diện cột không phân biệt hoa/thường nhưng **vẫn cần liệt kê đủ biến thể có dấu** trong code (VD phải khai báo cả "số đt" lẫn "sđt"). Bản web này **bỏ dấu tiếng Việt trước khi so khớp**, nên 1 từ đồng nghĩa không dấu là khớp được mọi biến thể có dấu — độ chính xác cao hơn, code gọn hơn, và đã test thật với file có: 2 dòng rác ở đầu (tên công ty, ngày xuất) + cột xáo trộn thứ tự hoàn toàn — nhận diện đúng 100%.

Áp dụng cho cả **Nhân sự** (nhập/xuất) và **Chấm công** (nhập log thô) — bản desktop chỉ có nhận diện thông minh ở Nhân sự, Chấm công phải đúng thứ tự cột cố định.


---

## 3. Một giả định cần bạn xác nhận

Bảng `loai_ca` không có UI tạo trực tiếp trong code desktop, chỉ thấy lệnh đọc dữ liệu — nên mình đoán tên cột hiển thị dựa theo quy ước đặt tên chung toàn hệ thống (`ten_don_vi`, `ten_khach_hang`...) và dùng `ten_ca` cho tên hiển thị của ca (VD "Ca 1", "Ca 2", "Ca đêm").

Nếu tên cột thật khác, phần hiển thị tên ca ở trang Ca kíp và Cài đặt sẽ trống — báo mình tên cột đúng để sửa lại (chỉ mất 1 phút, 2 chỗ cần đổi).

---

## 4. Bắt buộc: Deploy Edge Function (để module Tài khoản hoạt động)

Function `admin-create-user` đã có sẵn từ code desktop, copy nguyên vào project này — chỉ cần deploy lại cho project web:

```powershell
npm install -g supabase
supabase login
supabase link --project-ref ggfbimkbgbmltmocjrhw
supabase functions deploy admin-create-user
```

---

## 5. Deploy lên Cloudflare Pages (miễn phí, cho phép dùng thương mại)

1. Push code lên GitHub repo (Private)
2. Project đã có sẵn file `wrangler.jsonc` ở gốc
3. dash.cloudflare.com → Workers & Pages → Create → Connect to Git → chọn repo
4. Build command: `npm run build`, Output directory: `dist`
5. Thêm 3 biến môi trường giống `.env`
6. Deploy

Không dùng Vercel Hobby — điều khoản cấm dùng cho mục đích thương mại/công ty.

---

## 9. Khoá đồng thời (concurrency lock) — mới thêm

2 người cùng sửa 1 nhân viên/hợp đồng cùng lúc → ai lưu sau sẽ được cảnh báo "dữ liệu đã bị người khác thay đổi" thay vì âm thầm ghi đè. Cần chạy `migration_concurrency_lock.sql`.

## 10. Nhật ký hoạt động — mới thêm

Ghi lại ai thêm/sửa/xoá gì ở Nhân sự, Hợp đồng, Khách hàng, Chuyến hàng, Kho — ở tầng database (trigger), không lách được từ code. Chạy `migration_audit_log.sql`. Xem ở mục "Nhật ký hoạt động" trong sidebar.

## 11. Backup 3 lớp — mới thêm

Giống hệt QLHD: (1) xuất thủ công trong Cài đặt, (2) tự động vào GitHub repo hàng tuần, (3) tự động lên Google Drive theo lịch tự đặt.

Chạy `migration_backup_settings.sql`, rồi làm theo đúng hướng dẫn "Thiết lập Lớp 2" và "Thiết lập Lớp 3 — Google Drive" trong README của QLHD (quy trình y hệt, chỉ khác tên project Supabase) — thêm các GitHub Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_DRIVE_FOLDER_ID`.

## 12. ⚠️ Xoay khoá bị lộ — script đã chuẩn bị sẵn, làm rất cẩn thận

Đã viết sẵn `scripts/rotate_encryption_key.mjs` — giải mã toàn bộ dữ liệu nhạy cảm bằng khoá cũ, mã hoá lại bằng khoá mới. Đã test kỹ logic mã hoá/giải mã trước khi giao (giải mã đúng bằng khoá cũ, mã hoá lại đúng bằng khoá mới, xác nhận đọc lại đúng) — nhưng chưa từng chạy trên database thật của bạn, nên làm đúng thứ tự sau, không bỏ bước nào:

### Bước 1 — Tạo Google Service Account MỚI (khoá cũ đã lộ, không dùng lại)
1. Vào Google Cloud Console → project cũ (hoặc tạo mới) → IAM & Admin → Service Accounts
2. Thu hồi (Delete key) khoá JSON cũ đang dùng
3. Tạo key mới (Add Key → JSON), tải về, cập nhật vào code chỗ nào đang dùng `credentials.json` (đồng bộ Google Sheets)

### Bước 2 — Tạo Fernet key mới
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Lưu khoá này ở nơi an toàn (trình quản lý mật khẩu) — sẽ cần lại ở bước 4.

### Bước 3 — Sao lưu trước khi làm bất cứ gì
Đăng nhập app bằng admin → Cài đặt → Sao lưu dữ liệu thủ công → tải file `.json` về, giữ lại nơi an toàn.

### Bước 4 — Chạy script, LUÔN dry-run trước
```powershell
cd qlnv
cp .env.rotate.example .env.rotate
```
Mở `.env.rotate`, điền đủ 4 giá trị:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Settings → API Keys → tab "Legacy anon, service_role API keys")
- `OLD_ENCRYPTION_KEY` (khoá đang dùng, trong `config.py` cũ)
- `NEW_ENCRYPTION_KEY` (khoá mới tạo ở Bước 2)

```powershell
npm install
node scripts/rotate_encryption_key.mjs --dry-run
```

Đọc kỹ kết quả — số dòng quét, số dòng sẽ đổi, đặc biệt chú ý phần "CẢNH BÁO" (dòng nào giải mã lỗi bằng khoá cũ — có thể là dữ liệu cũ hơn nữa dùng khoá khác, cần hỏi lại mình trước khi tiếp tục nếu thấy nhiều cảnh báo).

### Bước 5 — Chạy thật (chỉ khi Bước 4 sạch, không cảnh báo lạ)
```powershell
node scripts/rotate_encryption_key.mjs --commit
```

### Bước 6 — Cập nhật khoá mới vào ứng dụng
- File `.env` local: đổi `VITE_ENCRYPTION_KEY` sang khoá mới
- Cloudflare Pages: Settings → Environment Variables → đổi `VITE_ENCRYPTION_KEY` → deploy lại
- Nếu còn dùng song song bản desktop: đổi `ENCRYPTION_KEY` trong `config.py`

### Bước 7 — Xoá file `.env.rotate` khỏi máy sau khi xong (chứa service role key thật)
```powershell
rm .env.rotate
```

### Bước 8 — Đổi repo desktop `QLNV-Cty_HoangHa` sang Private
Muộn còn hơn không — chặn người mới thấy được lịch sử cũ.

## 6. Vẫn còn treo: khoá bị lộ công khai trên GitHub

Repo desktop `QLNV-Cty_HoangHa` (public) có `credentials.json` (Google Service Account) và `config.py` (khoá Fernet) đã bị lộ trong lịch sử Git. Bạn đã chọn "để sau, làm web trước" — nhắc lại vì đây là rủi ro thật với dữ liệu SĐT/lương của khoảng 1000 nhân viên.

Khi sẵn sàng xử lý:
1. Thu hồi + tạo lại Google Service Account key mới (Google Cloud Console)
2. Tạo Fernet key mới, mã hoá lại toàn bộ dữ liệu cũ bằng key mới (nhan_vien, hop_dong, ho_so_luong, bang_luong, khach_hang) — cần 1 script chuyển đổi hàng loạt, không thể chỉ đổi key suông vì dữ liệu cũ sẽ không giải mã được nữa
3. Cập nhật VITE_ENCRYPTION_KEY ở cả bản web và bản desktop nếu còn dùng song song

Báo mình khi cần làm việc này.

---

## 7. Chưa làm — có thể bổ sung sau nếu cần

- Xuất Excel danh sách nhân viên / hợp đồng sắp hết hạn
- In hợp đồng ra file Word từ template
- Import Excel hàng loạt (nhân viên, log chấm công thô)
- Mã hoá địa chỉ nhân viên (desktop hiện cũng chưa mã hoá field này, chỉ SĐT)

## 8. Về mã hoá dữ liệu

Dùng lại đúng thuật toán Fernet của desktop, không đổi khoá, không cần mã hoá lại dữ liệu cũ — cài đặt lại bằng Web Crypto API thay vì thư viện `fernet` trên npm (thư viện đó phụ thuộc module Node.js, sẽ vỡ khi chạy trên trình duyệt thật dù build không báo lỗi). Đã test chéo Python và JS cả 2 chiều trước khi giao, tương thích 100%.
