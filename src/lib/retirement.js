// Tính tuổi nghỉ hưu theo lộ trình Nghị định 135/2020/NĐ-CP:
// - Nam: 2021 = 60 tuổi 3 tháng, mỗi năm sau +3 tháng, đủ 62 tuổi từ năm 2028 trở đi.
// - Nữ:  2021 = 55 tuổi 4 tháng, mỗi năm sau +4 tháng, đủ 60 tuổi từ năm 2035 trở đi.
// Lưu ý: đây là lộ trình chung, không tính các trường hợp nghỉ hưu sớm/muộn do
// suy giảm khả năng lao động, ngành nghề nặng nhọc độc hại, v.v. — chỉ mang tính
// tham khảo, cần đối chiếu quy định mới nhất khi dùng cho quyết định chính thức.

const NAM_TABLE = {
  2021: [60, 3], 2022: [60, 6], 2023: [60, 9], 2024: [61, 0],
  2025: [61, 3], 2026: [61, 6], 2027: [61, 9],
}
const NAM_FINAL = [62, 0]
const NAM_LAST_YEAR = 2027

const NU_TABLE = {
  2021: [55, 4], 2022: [55, 8], 2023: [56, 0], 2024: [56, 4],
  2025: [56, 8], 2026: [57, 0], 2027: [57, 4], 2028: [57, 8],
  2029: [58, 0], 2030: [58, 4], 2031: [58, 8], 2032: [59, 0],
  2033: [59, 4], 2034: [59, 8],
}
const NU_FINAL = [60, 0]
const NU_LAST_YEAR = 2034

function requiredAge(year, isNam) {
  if (isNam) {
    if (year <= 2021) return NAM_TABLE[2021]
    if (year > NAM_LAST_YEAR) return NAM_FINAL
    return NAM_TABLE[year] || NAM_FINAL
  }
  if (year <= 2021) return NU_TABLE[2021]
  if (year > NU_LAST_YEAR) return NU_FINAL
  return NU_TABLE[year] || NU_FINAL
}

function addYearsMonths(date, years, months) {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + years)
  d.setMonth(d.getMonth() + months)
  return d
}

function parseDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Tuổi hiện tại (số nguyên) từ ngày sinh. */
export function getAge(birthDateStr) {
  const birth = parseDate(birthDateStr)
  if (!birth) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

/** Thâm niên (số năm tròn) từ ngày vào công ty đến ngày nghỉ việc (hoặc hôm nay nếu còn làm). */
export function getSeniorityYears(hireDateStr, endDateStr) {
  const hire = parseDate(hireDateStr)
  if (!hire) return null
  const end = parseDate(endDateStr) || new Date()
  let years = end.getFullYear() - hire.getFullYear()
  const m = end.getMonth() - hire.getMonth()
  if (m < 0 || (m === 0 && end.getDate() < hire.getDate())) years--
  return Math.max(0, years)
}

/** Ngày dự kiến nghỉ hưu (Date) — lặp hội tụ vì tuổi yêu cầu phụ thuộc chính năm nghỉ hưu. */
export function getRetirementDate(birthDateStr, gender) {
  const birth = parseDate(birthDateStr)
  if (!birth) return null
  const isNam = gender === 'Nam'
  let guessYear = birth.getFullYear() + (isNam ? 60 : 55)
  let candidate = null
  for (let i = 0; i < 6; i++) {
    const [y, m] = requiredAge(guessYear, isNam)
    candidate = addYearsMonths(birth, y, m)
    if (candidate.getFullYear() === guessYear) return candidate
    guessYear = candidate.getFullYear()
  }
  return candidate
}

/** Nhãn tuổi nghỉ hưu, VD "61 tuổi 3 tháng". */
export function getRetirementAgeLabel(birthDateStr, gender) {
  const date = getRetirementDate(birthDateStr, gender)
  const birth = parseDate(birthDateStr)
  if (!date || !birth) return null
  let years = date.getFullYear() - birth.getFullYear()
  let months = date.getMonth() - birth.getMonth()
  if (months < 0) { years--; months += 12 }
  return months ? `${years} tuổi ${months} tháng` : `${years} tuổi`
}

/** Đếm ngược đến ngày nghỉ hưu: { date, days, years, months, isPast }. */
export function getRetirementCountdown(birthDateStr, gender) {
  const date = getRetirementDate(birthDateStr, gender)
  if (!date) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(date); target.setHours(0, 0, 0, 0)
  const days = Math.round((target - today) / 86400000)

  let years = target.getFullYear() - today.getFullYear()
  let months = target.getMonth() - today.getMonth()
  let d = target.getDate() - today.getDate()
  if (d < 0) months--
  if (months < 0) { years--; months += 12 }

  return { date, days, years: Math.max(0, years), months: Math.max(0, months), isPast: days < 0 }
}

const CANH_BAO_TRUOC_NGAY = 365 // cảnh báo khi còn <= 1 năm

/** Cảnh báo sắp/đã đến tuổi nghỉ hưu, hoặc null nếu chưa cần cảnh báo. */
export function getRetirementWarning(birthDateStr, gender) {
  const c = getRetirementCountdown(birthDateStr, gender)
  if (!c) return null
  if (c.isPast) return { level: 'danger', text: 'Đã quá tuổi nghỉ hưu theo luật' }
  if (c.days <= CANH_BAO_TRUOC_NGAY) {
    const phanNam = c.years > 0 ? `${c.years} năm ` : ''
    return { level: 'warning', text: `Sắp đến tuổi nghỉ hưu — còn ${phanNam}${c.months} tháng` }
  }
  return null
}
