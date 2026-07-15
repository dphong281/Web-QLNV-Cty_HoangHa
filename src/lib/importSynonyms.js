export const NHAN_VIEN_SYNONYMS = {
  'Mã NV': ['ma_nv', 'ma nv', 'ma nhan vien', 'manv', 'employee_code', 'msnv'],
  'Họ tên': ['ho_ten', 'ho ten', 'ho va ten', 'hoten', 'full_name', 'ten nhan vien'],
  'Ngày sinh': ['ngay_sinh', 'ngay sinh', 'date_of_birth', 'dob', 'ngay thang nam sinh'],
  'Giới tính': ['gioi_tinh', 'gioi tinh', 'gender', 'phai'],
  'Số CCCD': ['so_cccd', 'so cccd', 'cccd', 'cmnd', 'so cmnd', 'can cuoc cong dan'],
  'Ngày cấp CCCD': ['ngay_cap_cccd', 'ngay cap cccd', 'ngay cap'],
  'Nơi cấp': ['noi_cap', 'noi cap'],
  'Mã số thuế': ['ma_so_thue', 'ma so thue', 'mst', 'tax_code'],
  'Số BHXH': ['so_bhxh', 'so bhxh', 'bhxh', 'social_insurance'],
  'Tình trạng hôn nhân': ['tinh_trang_hon_nhan', 'tinh trang hon nhan', 'hon nhan', 'marital_status'],
  'Quốc tịch': ['quoc_tich', 'quoc tich', 'nationality'],
  'Địa chỉ thường trú': ['dia_chi_thuong_tru', 'dia chi thuong tru', 'dia chi', 'address'],
  'Địa chỉ hiện tại': ['dia_chi_hien_tai', 'dia chi hien tai', 'noi o hien tai', 'current_address'],
  'Số ĐT': ['so_dt', 'so dt', 'sdt', 'so dien thoai', 'phone', 'dien thoai'],
  'Email': ['email', 'e-mail', 'thu dien tu', 'email ca nhan'],
  'Email công ty': ['email_cong_ty', 'email cong ty', 'company_email'],
  'Người liên hệ khẩn cấp': ['nguoi_lien_he_khan_cap', 'nguoi lien he khan cap', 'emergency_contact'],
  'SĐT khẩn cấp': ['sdt_khan_cap', 'sdt khan cap', 'so dt khan cap', 'emergency_phone'],
  'Khối': ['khoi', 'bo phan', 'phong ban', 'department'],
  'Chức vụ': ['chuc_vu', 'chuc vu', 'chuc danh', 'position'],
  'Cấp bậc': ['cap_bac', 'cap bac', 'rank'],
  'Nơi làm việc': ['noi_lam_viec', 'noi lam viec', 'don vi', 'tram', 'unit_name'],
  'Ngạch': ['ngach'],
  'Quản lý trực tiếp': ['quan_ly_truc_tiep', 'quan ly truc tiep', 'nguoi quan ly', 'manager'],
  'Ngày vào Cty': ['ngay_vao_cty', 'ngay vao cty', 'ngay vao cong ty', 'hire_date', 'ngay vao lam'],
  'Ngày nghỉ việc': ['ngay_nghi_viec', 'ngay nghi viec', 'termination_date'],
  'Trạng thái': ['trang_thai', 'trang thai', 'tinh trang', 'status'],
  'Quyết định đi kèm': ['quyet_dinh_di_kem', 'quyet dinh di kem', 'quyet dinh'],
  'Số người phụ thuộc': ['so_nguoi_phu_thuoc', 'so nguoi phu thuoc', 'nguoi phu thuoc', 'dependents'],
  'Số tài khoản': ['so_tai_khoan', 'so tai khoan', 'stk', 'bank_account'],
  'Ngân hàng': ['ngan_hang', 'ngan hang', 'bank'],
  'Trình độ': ['trinh_do', 'trinh do', 'education_level'],
  'Chuyên ngành': ['chuyen_nganh', 'chuyen nganh', 'major'],
  'Ghi chú': ['ghi_chu', 'ghi chu', 'note'],
  'Ghi chú nghỉ hưu': ['ghi_chu_nghi_huu', 'ghi chu nghi huu'],
  'Thông tin học vấn': ['thong_tin_hoc_van', 'thong tin hoc van', 'hoc van'],
  'Thông tin gia đình': ['thong_tin_gia_dinh', 'thong tin gia dinh', 'gia dinh'],
}

export const NHAN_VIEN_HEADERS = Object.keys(NHAN_VIEN_SYNONYMS)
export const NHAN_VIEN_REQUIRED = ['Mã NV', 'Họ tên']

export const CHAM_CONG_RAW_SYNONYMS = {
  'Mã NV': ['ma_nv', 'ma nv', 'ma nhan vien', 'manv', 'employee_code'],
  'Ngày': ['ngay', 'ngay cham cong', 'date', 'ngay lam'],
  'Giờ vào': ['gio_vao', 'gio vao', 'check_in', 'gio vao ca'],
  'Giờ ra': ['gio_ra', 'gio ra', 'check_out', 'gio ra ca'],
}
export const CHAM_CONG_RAW_HEADERS = Object.keys(CHAM_CONG_RAW_SYNONYMS)
export const CHAM_CONG_RAW_REQUIRED = ['Mã NV', 'Ngày']
