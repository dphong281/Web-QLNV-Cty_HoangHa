export const NHAN_VIEN_SYNONYMS = {
  'Mã NV': ['ma_nv', 'ma nv', 'ma nhan vien', 'manv', 'employee_code', 'msnv'],
  'Họ tên': ['ho_ten', 'ho ten', 'ho va ten', 'hoten', 'full_name', 'ten nhan vien'],
  'Ngày sinh': ['ngay_sinh', 'ngay sinh', 'date_of_birth', 'dob', 'ngay thang nam sinh'],
  'Giới tính': ['gioi_tinh', 'gioi tinh', 'gender', 'phai'],
  'Số CCCD': ['so_cccd', 'so cccd', 'cccd', 'cmnd', 'so cmnd', 'can cuoc cong dan'],
  'Ngày cấp CCCD': ['ngay_cap_cccd', 'ngay cap cccd', 'ngay cap'],
  'Nơi cấp': ['noi_cap', 'noi cap'],
  'Địa chỉ thường trú': ['dia_chi_thuong_tru', 'dia chi thuong tru', 'dia chi', 'address'],
  'Số ĐT': ['so_dt', 'so dt', 'sdt', 'so dien thoai', 'phone', 'dien thoai'],
  'Email': ['email', 'e-mail', 'thu dien tu'],
  'Khối': ['khoi', 'bo phan', 'phong ban', 'department'],
  'Chức vụ': ['chuc_vu', 'chuc vu', 'chuc danh', 'position'],
  'Nơi làm việc': ['noi_lam_viec', 'noi lam viec', 'don vi', 'tram', 'unit_name'],
  'Ngạch': ['ngach'],
  'Ngày vào Cty': ['ngay_vao_cty', 'ngay vao cty', 'ngay vao cong ty', 'hire_date', 'ngay vao lam'],
  'Trạng thái': ['trang_thai', 'trang thai', 'tinh trang', 'status'],
  'Quyết định đi kèm': ['quyet_dinh_di_kem', 'quyet dinh di kem', 'quyet dinh'],
  'Ghi chú': ['ghi_chu', 'ghi chu', 'note'],
  'Thông tin học vấn': ['thong_tin_hoc_van', 'thong tin hoc van', 'hoc van', 'trinh do'],
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
