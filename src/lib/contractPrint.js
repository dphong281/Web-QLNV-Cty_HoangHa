import { parseFlexibleDate } from './format'

// ---------- Ánh xạ Khối -> hậu tố file mẫu ----------
const KHOI_TO_SUFFIX = { VanPhong: 'VP', CayXang: 'CHXD', TaiXe: 'TAU' }

// ---------- Cấu hình từng loại mẫu in ----------
// fields: danh sách control field hiển thị trên popup, theo đúng thứ tự trong file Excel gốc.
const HDTV_FIELDS = [
  { key: 'SoHopDong', label: 'Số HĐTV', placeholder: 'VD: 015/2026' },
  { key: 'NgayKy', label: 'Ngày ký', type: 'date' },
  { key: 'HoTen', label: 'Họ tên' },
  { key: 'NgaySinh', label: 'Ngày sinh', type: 'date' },
  { key: 'CCCD', label: 'Số CCCD' },
  { key: 'NgayCap', label: 'Ngày cấp CCCD', type: 'date' },
  { key: 'NoiCap', label: 'Nơi cấp CCCD' },
  { key: 'DiaChi', label: 'Địa chỉ' },
  { key: 'DienThoai', label: 'Điện thoại' },
  { key: 'Email', label: 'Email' },
  { key: 'BoPhan', label: 'Bộ phận công tác' },
  { key: 'ChucDanh', label: 'Chức danh' },
  { key: 'LuongThuViec', label: 'Lương thử việc (VNĐ/tháng)', type: 'currency' },
  { key: 'SoNgayThuViec', label: 'Thời gian thử việc (ngày)', default: '60' },
  { key: 'NgayBatDau', label: 'Bắt đầu thử việc', type: 'date' },
  { key: 'NgayKetThuc', label: 'Kết thúc thử việc', type: 'date' },
]

const HDLD_FIELDS = [
  { key: 'SoHopDong', label: 'Số HĐLĐ', placeholder: 'VD: 015/2026' },
  { key: 'NgayKy', label: 'Ngày ký', type: 'date' },
  { key: 'HoTen', label: 'Họ tên' },
  { key: 'NgaySinh', label: 'Ngày sinh', type: 'date' },
  { key: 'CCCD', label: 'Số CCCD' },
  { key: 'NgayCap', label: 'Ngày cấp CCCD', type: 'date' },
  { key: 'NoiCap', label: 'Nơi cấp CCCD' },
  { key: 'DiaChi', label: 'Địa chỉ' },
  { key: 'DienThoai', label: 'Điện thoại' },
  { key: 'Email', label: 'Email' },
  { key: 'BoPhan', label: 'Bộ phận công tác' },
  { key: 'ChucDanh', label: 'Chức danh' },
  { key: 'LoaiHopDong', label: 'Loại hợp đồng', placeholder: 'VD: Xác định thời hạn 24 tháng' },
  { key: 'LuongChucDanh', label: 'Lương chức danh (VNĐ/tháng)', type: 'currency' },
  { key: 'NgayBatDau', label: 'Bắt đầu hiệu lực', type: 'date' },
  { key: 'NgayKetThuc', label: 'Kết thúc (bỏ trống nếu không XĐ thời hạn)', type: 'date', optional: true },
]

const QDTV_FIELDS = [
  { key: 'SoQuyetDinh', label: 'Số quyết định', placeholder: 'VD: 015/QĐ' },
  { key: 'NgayKy', label: 'Ngày quyết định', type: 'date' },
  { key: 'ViTri', label: 'Vị trí quyết định (tiếp nhận thử việc vị trí...)' },
  { key: 'HoTen', label: 'Họ tên' },
  { key: 'NgaySinh', label: 'Ngày sinh', type: 'date' },
  { key: 'CCCD', label: 'Số CCCD' },
  { key: 'NgayCap', label: 'Ngày cấp CCCD', type: 'date' },
  { key: 'NoiCap', label: 'Nơi cấp CCCD' },
  { key: 'DiaChi', label: 'Hộ khẩu thường trú' },
  { key: 'TrinhDo', label: 'Trình độ chuyên môn' },
  { key: 'BoPhan', label: 'Bộ phận' },
  { key: 'ChucDanh', label: 'Chức vụ' },
  { key: 'HeSoBac', label: 'Hệ số bậc lương', placeholder: 'VD: 1' },
  { key: 'NgayBatDau', label: 'Bắt đầu thử việc', type: 'date' },
  { key: 'NgayKetThuc', label: 'Kết thúc thử việc', type: 'date' },
  { key: 'NgayHieuLuc', label: 'Ngày quyết định có hiệu lực', type: 'date' },
]

// key: `${loaiHd}_${suffix}` — loaiHd dùng đúng mã đã có trong app: ThuViec / XacDinhThoiHan / KhongXacDinhThoiHan
export const PRINT_TEMPLATES = {
  ThuViec_VP: { file: 'HDTV_VP.docx', label: 'Hợp đồng thử việc — Văn phòng', fields: HDTV_FIELDS },
  ThuViec_CHXD: { file: 'HDTV_CHXD.docx', label: 'Hợp đồng thử việc — Cửa hàng xăng dầu', fields: HDTV_FIELDS },
  ThuViec_TAU: { file: 'HDTV_TAU.docx', label: 'Hợp đồng thử việc — Tàu', fields: HDTV_FIELDS },
  HopDongLaoDong_VP: { file: 'HDLD_VP.docx', label: 'Hợp đồng lao động — Văn phòng', fields: HDLD_FIELDS },
  HopDongLaoDong_CHXD: { file: 'HDLD_CHXD.docx', label: 'Hợp đồng lao động — Cửa hàng xăng dầu', fields: HDLD_FIELDS },
  HopDongLaoDong_TAU: { file: 'HDLD_TAU.docx', label: 'Hợp đồng lao động — Tàu', fields: HDLD_FIELDS },
  QuyetDinhThuViec_VP: { file: 'QDTV_VP.docx', label: 'Quyết định tiếp nhận thử việc — Văn phòng', fields: QDTV_FIELDS },
}

export function getTemplateKey(loaiVanBan, khoi) {
  const suffix = KHOI_TO_SUFFIX[khoi] || 'VP'
  const key = `${loaiVanBan}_${suffix}`
  return PRINT_TEMPLATES[key] ? key : `${loaiVanBan}_VP` // QĐ hiện chỉ có bản VP
}

function pad2(n) { return String(n).padStart(2, '0') }

function splitDate(value) {
  const d = parseFlexibleDate(value)
  if (!d) return { Ngay: '……', Thang: '……', Nam: '………' }
  return { Ngay: pad2(d.getDate()), Thang: pad2(d.getMonth() + 1), Nam: String(d.getFullYear()) }
}

function formatDDMMYYYY(value) {
  const d = parseFlexibleDate(value)
  if (!d) return '……/……/………'
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}

function formatMoney(value) {
  const n = Number(value)
  if (!n) return '……………………'
  return n.toLocaleString('vi-VN')
}

// Chuẩn hoá dữ liệu form -> object phẳng khớp tag {Tag} trong file .docx.
// Các trường ngày được tách _Ngay/_Thang/_Nam khi tag dùng dạng đó (NgayKy, NgayCap, NgaySinh),
// còn NgayBatDau/NgayKetThuc/NgayHieuLuc dùng dạng dd/mm/yyyy nguyên khối.
export function buildDocxValues(fields, formValues) {
  const out = {}
  for (const f of fields) {
    const raw = formValues[f.key]
    if (f.type === 'date') {
      if (['NgayKy', 'NgayCap', 'NgaySinh'].includes(f.key)) {
        const { Ngay, Thang, Nam } = splitDate(raw)
        out[`${f.key}_Ngay`] = Ngay
        out[`${f.key}_Thang`] = Thang
        out[`${f.key}_Nam`] = Nam
      } else {
        out[f.key] = formatDDMMYYYY(raw)
      }
    } else if (f.type === 'currency') {
      out[f.key] = formatMoney(raw)
    } else {
      out[f.key] = raw || `……………………`
    }
  }
  return out
}

// Ngày sinh/Ngày cấp CCCD lưu ở nhan_vien dạng CHỮ "dd/mm/yyyy" — ô <input type="date">
// của trình duyệt chỉ nhận value dạng "yyyy-mm-dd", nếu đưa thẳng dd/mm/yyyy vào sẽ bị
// trình duyệt âm thầm bỏ qua (hiển thị trống, không báo lỗi gì).
function toIsoForDateInput(value) {
  const d = parseFlexibleDate(value)
  if (!d) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

// Điền sẵn control field từ dữ liệu nhân viên (và hợp đồng đang có, nếu có) — người dùng vẫn sửa được trước khi in.
export async function prefillFromEmployee(emp, contract) {
  const values = {
    HoTen: emp?.['Họ tên'] || '',
    NgaySinh: toIsoForDateInput(emp?.['Ngày sinh']),
    CCCD: emp?.['Số CCCD'] || '',
    NgayCap: toIsoForDateInput(emp?.['Ngày cấp CCCD']),
    NoiCap: emp?.['Nơi cấp'] || '',
    DiaChi: emp?.['Địa chỉ thường trú'] || emp?.['Địa chỉ hiện tại'] || '',
    DienThoai: emp?.['Số ĐT'] || '',
    Email: emp?.['Email'] || emp?.['Email công ty'] || '',
    BoPhan: emp?.['Nơi làm việc'] || '',
    ChucDanh: emp?.['Chức vụ'] || '',
    TrinhDo: emp?.['Trình độ'] || '',
  }
  if (contract) {
    // Ưu tiên số HĐ công ty tự đánh (so_hd_goc) — đây mới là số thật sự cần in ra văn bản,
    // không phải mã hệ thống (ma_hd) chỉ dùng nội bộ để tra cứu.
    values.SoHopDong = contract.so_hd_goc || contract.ma_hd || ''
    values.NgayKy = contract.ngay_ky || ''
    values.NgayBatDau = contract.ngay_hieu_luc || ''
    values.NgayKetThuc = contract.ngay_het_han || ''
    values.LuongThuViec = contract.luong_co_ban || ''
    values.LuongChucDanh = contract.luong_co_ban || ''
  }
  return values
}

async function loadTemplateFile(fileName) {
  const res = await fetch(`/templates/${fileName}`)
  if (!res.ok) throw new Error(`Không tải được file mẫu ${fileName}`)
  return res.arrayBuffer()
}

// Sinh file .docx từ mẫu + dữ liệu, rồi tải về trình duyệt.
export async function generateAndDownloadContract(templateKey, values, downloadName) {
  const config = PRINT_TEMPLATES[templateKey]
  if (!config) throw new Error('Không tìm thấy mẫu in phù hợp.')

  // Chỉ tải thư viện tạo file Word khi thực sự bấm in — không tải kèm cho mọi trang khác.
  const [{ default: PizZip }, { default: Docxtemplater }] = await Promise.all([
    import('pizzip'),
    import('docxtemplater'),
  ])

  const content = await loadTemplateFile(config.file)
  const zip = new PizZip(content)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{', end: '}' },
    nullGetter: () => '……………………',
  })
  doc.render(values)

  const blob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = downloadName || `${config.file.replace('.docx', '')}_${Date.now()}.docx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
