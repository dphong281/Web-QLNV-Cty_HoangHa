// Script XOAY KHOÁ MÃ HOÁ — chạy trên máy bạn (KHÔNG chạy trên web/production trực tiếp).
//
// Việc này giải mã toàn bộ dữ liệu nhạy cảm bằng khoá CŨ, rồi mã hoá lại bằng khoá MỚI,
// ghi đè lại vào database. Rủi ro cao nếu làm sai — vì vậy script có sẵn chế độ
// "DRY RUN" (chỉ xem trước, không ghi gì cả) — LUÔN chạy dry-run trước, kiểm tra kỹ,
// rồi mới chạy thật.
//
// BẮT BUỘC: đã tải file backup thủ công (Cài đặt → Sao lưu dữ liệu thủ công) TRƯỚC
// khi chạy script này ở chế độ ghi thật — để có đường lùi nếu có sự cố.
//
// Cách chạy:
//   node scripts/rotate_encryption_key.mjs --dry-run     (xem trước, an toàn 100%)
//   node scripts/rotate_encryption_key.mjs --commit       (ghi thật — chỉ chạy sau khi dry-run ổn)
//
// Cần các biến môi trường (đặt trong file .env.rotate, xem .env.rotate.example):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (Settings → API Keys → "Legacy anon, service_role API keys")
//   OLD_ENCRYPTION_KEY                        (khoá Fernet hiện tại, trong config.py cũ)
//   NEW_ENCRYPTION_KEY                        (khoá Fernet mới, tự sinh — xem hướng dẫn README)

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

function loadEnvFile(path) {
  const env = {}
  try {
    const content = readFileSync(path, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx === -1) continue
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
    }
  } catch (_e) {
    console.error(`Không đọc được file ${path}. Copy từ .env.rotate.example rồi điền giá trị thật.`)
    process.exit(1)
  }
  return env
}

const env = loadEnvFile(new URL('../.env.rotate', import.meta.url))
const SUPABASE_URL = env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const OLD_KEY = env.OLD_ENCRYPTION_KEY
const NEW_KEY = env.NEW_ENCRYPTION_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OLD_KEY || !NEW_KEY) {
  console.error('Thiếu biến môi trường trong .env.rotate. Kiểm tra lại đủ 4 dòng: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OLD_ENCRYPTION_KEY, NEW_ENCRYPTION_KEY')
  process.exit(1)
}

const isDryRun = !process.argv.includes('--commit')
if (isDryRun) {
  console.log('CHE DO DRY-RUN - chi xem truoc, KHONG ghi gi vao database.\n')
} else {
  console.log('CHE DO GHI THAT - se cap nhat du lieu that trong database.\n')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function base64UrlToBytes(b64url) {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4) b64 += '='
  return Uint8Array.from(Buffer.from(b64, 'base64'))
}
function bytesToBase64Url(bytes) {
  return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_')
}
function concatBytes(...arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) { result.set(a, offset); offset += a.length }
  return result
}
async function getKeys(rawKey) {
  const raw = base64UrlToBytes(rawKey)
  if (raw.length !== 32) throw new Error(`Khoa khong dung dinh dang (phai 32 byte): ${rawKey.slice(0, 10)}...`)
  const signingKey = await crypto.subtle.importKey('raw', raw.slice(0, 16), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
  const encryptionKey = await crypto.subtle.importKey('raw', raw.slice(16, 32), { name: 'AES-CBC' }, false, ['encrypt', 'decrypt'])
  return { signingKey, encryptionKey }
}
function timestampToBytes(unixSeconds) {
  const bytes = new Uint8Array(8)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, Math.floor(unixSeconds / 2 ** 32), false)
  view.setUint32(4, unixSeconds % 2 ** 32, false)
  return bytes
}
async function decryptValue(value, keys) {
  if (value === null || value === undefined || value === '') return value
  if (typeof value !== 'string') return value
  const tokenBytes = base64UrlToBytes(value)
  if (tokenBytes.length < 57) throw new Error('Token qua ngan, khong phai Fernet hop le')
  const version = tokenBytes.slice(0, 1)
  const timestampBytes = tokenBytes.slice(1, 9)
  const iv = tokenBytes.slice(9, 25)
  const hmacBytes = tokenBytes.slice(tokenBytes.length - 32)
  const cipherBytes = tokenBytes.slice(25, tokenBytes.length - 32)
  const signInput = concatBytes(version, timestampBytes, iv, cipherBytes)
  const valid = await crypto.subtle.verify('HMAC', keys.signingKey, hmacBytes, signInput)
  if (!valid) throw new Error('HMAC khong khop - sai khoa')
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, keys.encryptionKey, cipherBytes)
  return new TextDecoder().decode(plainBuf)
}
async function encryptValue(value, keys) {
  if (value === null || value === undefined || value === '') return null
  const iv = crypto.getRandomValues(new Uint8Array(16))
  const timestampBytes = timestampToBytes(Math.floor(Date.now() / 1000))
  const version = new Uint8Array([0x80])
  const plainBytes = new TextEncoder().encode(String(value))
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, keys.encryptionKey, plainBytes)
  const signInput = concatBytes(version, timestampBytes, iv, new Uint8Array(cipherBuf))
  const hmacBuf = await crypto.subtle.sign('HMAC', keys.signingKey, signInput)
  return bytesToBase64Url(concatBytes(signInput, new Uint8Array(hmacBuf)))
}

async function reencryptField(value, oldKeys, newKeys) {
  if (value === null || value === undefined || value === '') return { changed: false, value }
  let plain
  try {
    plain = await decryptValue(value, oldKeys)
  } catch (e) {
    return { changed: false, value, error: `Khong giai ma duoc bang khoa cu: ${e.message}` }
  }
  const reencrypted = await encryptValue(plain, newKeys)
  return { changed: true, value: reencrypted, preview: plain }
}

const TARGETS = [
  { table: 'nhan_vien', idCol: 'Mã NV', fields: ['Số ĐT'] },
  { table: 'hop_dong', idCol: 'ma_hd', fields: ['luong_co_ban', 'phu_cap_doc_hai', 'phu_cap_trach_nhiem'] },
  { table: 'ho_so_luong', idCol: 'ma_nv', fields: ['luong_co_ban', 'phu_cap_co_dinh', 'don_gia_ca_dem', 'don_gia_ot_gio', 'don_gia_chuyen', 'muc_phat_vang_mat'] },
  { table: 'bang_luong', idCol: 'id', fields: ['luong_co_ban', 'phu_cap', 'luong_ca_dem', 'luong_ot', 'luong_chuyen', 'khau_tru', 'thuc_lanh'] },
  { table: 'khach_hang', idCol: 'ma_kh', fields: ['ten_khach_hang', 'so_dt', 'dia_chi', 'email'] },
]

async function run() {
  const oldKeys = await getKeys(OLD_KEY)
  const newKeys = await getKeys(NEW_KEY)

  let totalRows = 0
  let totalChanged = 0
  let totalErrors = 0

  for (const { table, idCol, fields } of TARGETS) {
    const selectCols = [idCol, ...fields].map((c) => `"${c}"`).join(', ')
    const { data: rows, error } = await supabase.from(table).select(selectCols)
    if (error) {
      console.error(`Loi doc bang ${table}: ${error.message}`)
      continue
    }

    console.log(`\n=== Bang ${table} (${rows.length} dong) ===`)

    for (const row of rows) {
      totalRows += 1
      const updatePayload = {}
      let rowChanged = false
      let rowError = null

      for (const field of fields) {
        const result = await reencryptField(row[field], oldKeys, newKeys)
        if (result.error) { rowError = result.error; continue }
        if (result.changed) { updatePayload[field] = result.value; rowChanged = true }
      }

      if (rowError) {
        totalErrors += 1
        console.log(`  CANH BAO ${row[idCol]}: ${rowError}`)
        continue
      }
      if (!rowChanged) continue

      totalChanged += 1
      if (isDryRun) {
        console.log(`  OK ${row[idCol]}: se ma hoa lai ${Object.keys(updatePayload).length} truong`)
      } else {
        const { error: updateError } = await supabase.from(table).update(updatePayload).eq(idCol, row[idCol])
        if (updateError) {
          totalErrors += 1
          console.log(`  LOI ${row[idCol]}: loi ghi - ${updateError.message}`)
        } else {
          console.log(`  OK ${row[idCol]}: da ma hoa lai`)
        }
      }
    }
  }

  console.log(`\n=== TONG KET ===`)
  console.log(`Tong so dong quet: ${totalRows}`)
  console.log(`So dong ${isDryRun ? 'se duoc' : 'da duoc'} ma hoa lai: ${totalChanged}`)
  console.log(`So loi: ${totalErrors}`)
  if (isDryRun) {
    console.log('\nDay moi la dry-run. Neu ket qua o tren hop ly (khong co loi la), chay lai voi --commit de ghi that.')
  } else {
    console.log('\nXong. Nho cap nhat VITE_ENCRYPTION_KEY sang khoa MOI o ca web (Cloudflare) va desktop (neu con dung song song).')
  }
}

run().catch((err) => {
  console.error('Loi khong xu ly duoc:', err)
  process.exit(1)
})
