// Danh mục dùng chung cho form Nhân sự — lấy đúng từ sheet DanhMuc trong file
// mẫu Excel của Hoàng Hà (Copy_of_data_nhân_sự.xlsx), để dropdown khớp với
// dữ liệu thật công ty đang dùng thay vì tự bịa danh sách.
//
// Đây là danh sách GỢI Ý (datalist) chứ không khoá cứng — vẫn cho gõ giá trị
// khác nếu công ty mở thêm bộ phận/ngân hàng mới mà chưa kịp cập nhật ở đây.

export const BO_PHAN_OPTIONS = [
  'Ban Giám đốc',
  'Hội đồng thành viên',
  'Phòng Quản lý và khai thác',
  'Phòng Tổ chức hành chính',
  'Phòng kinh doanh',
  'Phòng kế toán',
  'Phòng kỹ thuật',
  'Cửa hàng xăng dầu Hoàng Hà',
  'Cửa hàng xăng dầu Hoàng Hà số 2',
  'Cửa hàng xăng dầu Hoàng Hà số 3',
  'Cửa hàng xăng dầu Xanda',
  'Cửa hàng xăng dầu Yên Thủy',
  'Tàu HH 162',
  'Tàu Hoàng Hà Ocean',
  'Tàu Hoàng Hà Star',
  'Chưa phân bộ phận',
]

export const CAP_BAC_OPTIONS = ['Thực tập', 'Nhân viên', 'Chuyên viên', 'Trưởng nhóm', 'Quản lý', 'Giám đốc']

export const TRINH_DO_OPTIONS = ['THPT', 'Trung cấp', 'Cao đẳng', 'Đại học', 'Sau đại học', 'Khác']

export const NGAN_HANG_OPTIONS = [
  'Vietcombank', 'BIDV', 'VietinBank', 'Techcombank', 'MB', 'ACB', 'VPBank', 'Sacombank', 'Khác',
]
