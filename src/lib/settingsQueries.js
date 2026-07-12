import { supabase } from './supabase'

export async function getAllSettings() {
  const res = await supabase.from('cai_dat_he_thong').select('*').order('khoa')
  if (res.error) throw res.error
  return res.data
}

export async function getValue(khoa, fallback = null) {
  const res = await supabase.from('cai_dat_he_thong').select('gia_tri').eq('khoa', khoa).limit(1)
  if (res.error) throw res.error
  return res.data.length ? res.data[0].gia_tri : fallback
}

export async function setValue(khoa, giaTri, moTa) {
  const payload = { khoa, gia_tri: giaTri, updated_at: new Date().toISOString() }
  if (moTa !== undefined) payload.mo_ta = moTa
  const res = await supabase.from('cai_dat_he_thong').upsert(payload, { onConflict: 'khoa' })
  if (res.error) throw res.error
}

export async function deleteSetting(khoa) {
  const res = await supabase.from('cai_dat_he_thong').delete().eq('khoa', khoa)
  if (res.error) throw res.error
}

// ---------- SAO LƯU THỦ CÔNG ----------
// Xuất toàn bộ dữ liệu nghiệp vụ (giữ nguyên dạng đã mã hoá) ra 1 file JSON.
export async function exportAllDataForBackup() {
  const [nhanVien, hopDong, khachHang, chuyenHang, kho, hoSoLuong, taiKhoan] = await Promise.all([
    supabase.from('nhan_vien').select('*'),
    supabase.from('hop_dong').select('*'),
    supabase.from('khach_hang').select('*'),
    supabase.from('chuyen_hang').select('*'),
    supabase.from('nhap_xuat_kho').select('*'),
    supabase.from('ho_so_luong').select('*'),
    supabase.from('tai_khoan').select('user_id, ho_ten, email, is_admin, phong_ban, chuc_vu, is_active'),
  ])
  const all = [nhanVien, hopDong, khachHang, chuyenHang, kho, hoSoLuong, taiKhoan]
  const firstError = all.find((r) => r.error)
  if (firstError) throw new Error(firstError.error.message)

  return {
    xuat_luc: new Date().toISOString(),
    ghi_chu: 'SĐT nhân viên, lương và các trường nhạy cảm khác đang ở dạng đã mã hoá (Fernet).',
    nhan_vien: nhanVien.data,
    hop_dong: hopDong.data,
    khach_hang: khachHang.data,
    chuyen_hang: chuyenHang.data,
    nhap_xuat_kho: kho.data,
    ho_so_luong: hoSoLuong.data,
    tai_khoan: taiKhoan.data,
  }
}
