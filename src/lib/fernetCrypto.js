// Mã hoá/giải mã tương thích 100% với thư viện Python `cryptography.fernet`
// mà app desktop QLNV đang dùng — cùng 1 khoá (VITE_ENCRYPTION_KEY) đọc/ghi
// được đúng dữ liệu SĐT/lương đã mã hoá sẵn trong Supabase.
//
// Tự cài đặt lại đúng chuẩn Fernet (https://github.com/fernet/spec) bằng
// Web Crypto API gốc của trình duyệt — KHÔNG dùng thư viện npm "fernet" vì
// thư viện đó phụ thuộc module `crypto` của Node.js, không chạy được khi
// build ra web thật (chỉ lỗi lúc runtime, build vẫn "qua" nên rất dễ bỏ sót).
//
// Cấu trúc token Fernet: version(1B) || timestamp(8B) || IV(16B) || ciphertext(AES-128-CBC) || HMAC-SHA256(32B)
// Khoá Fernet: 32 byte (base64) = 16 byte signing key (HMAC) + 16 byte encryption key (AES)

const RAW_KEY = import.meta.env.VITE_ENCRYPTION_KEY

let cachedKeys = null

function base64UrlToBytes(b64url) {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4) b64 += '='
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToBase64Url(bytes) {
  let binary = ''
  bytes.forEach((b) => { binary += String.fromCharCode(b) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_')
}

function concatBytes(...arrays) {
  const total = arrays.reduce((sum, a) => sum + a.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) {
    result.set(a, offset)
    offset += a.length
  }
  return result
}

async function getKeys() {
  if (cachedKeys) return cachedKeys
  if (!RAW_KEY) {
    throw new Error('Thiếu VITE_ENCRYPTION_KEY trong .env — không thể mã hoá/giải mã dữ liệu.')
  }
  const raw = base64UrlToBytes(RAW_KEY)
  if (raw.length !== 32) {
    throw new Error('VITE_ENCRYPTION_KEY không đúng định dạng khoá Fernet (phải là 32 byte / 44 ký tự base64).')
  }
  const signingKeyBytes = raw.slice(0, 16)
  const encryptionKeyBytes = raw.slice(16, 32)
  const signingKey = await crypto.subtle.importKey(
    'raw', signingKeyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  )
  const encryptionKey = await crypto.subtle.importKey(
    'raw', encryptionKeyBytes, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']
  )
  cachedKeys = { signingKey, encryptionKey }
  return cachedKeys
}

function timestampToBytes(unixSeconds) {
  const bytes = new Uint8Array(8)
  const view = new DataView(bytes.buffer)
  // Chia làm 2 phần 32-bit vì DataView không có setUint64 gốc — đủ dùng tới năm 2106.
  view.setUint32(0, Math.floor(unixSeconds / 2 ** 32), false)
  view.setUint32(4, unixSeconds % 2 ** 32, false)
  return bytes
}

// Mã hoá 1 giá trị -> chuỗi token Fernet. null/rỗng -> null.
export async function encryptValue(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const { signingKey, encryptionKey } = await getKeys()

  const iv = crypto.getRandomValues(new Uint8Array(16))
  const timestampBytes = timestampToBytes(Math.floor(Date.now() / 1000))
  const version = new Uint8Array([0x80])

  const plainBytes = new TextEncoder().encode(String(value))
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, encryptionKey, plainBytes)
  const cipherBytes = new Uint8Array(cipherBuf)

  const signInput = concatBytes(version, timestampBytes, iv, cipherBytes)
  const hmacBuf = await crypto.subtle.sign('HMAC', signingKey, signInput)
  const tokenBytes = concatBytes(signInput, new Uint8Array(hmacBuf))

  return bytesToBase64Url(tokenBytes)
}

// Giải mã 1 token Fernet -> chuỗi gốc. Dữ liệu cũ chưa mã hoá (plaintext)
// hoặc lỗi giải mã -> trả nguyên văn, không throw (an toàn với dữ liệu cũ).
export async function decryptValue(value) {
  if (value === null || value === undefined || value === '') return value
  if (typeof value !== 'string') return value
  try {
    const { signingKey, encryptionKey } = await getKeys()
    const tokenBytes = base64UrlToBytes(value)
    if (tokenBytes.length < 1 + 8 + 16 + 32) throw new Error('token quá ngắn')

    const version = tokenBytes.slice(0, 1)
    const timestampBytes = tokenBytes.slice(1, 9)
    const iv = tokenBytes.slice(9, 25)
    const hmacBytes = tokenBytes.slice(tokenBytes.length - 32)
    const cipherBytes = tokenBytes.slice(25, tokenBytes.length - 32)

    const signInput = concatBytes(version, timestampBytes, iv, cipherBytes)
    const valid = await crypto.subtle.verify('HMAC', signingKey, hmacBytes, signInput)
    if (!valid) throw new Error('HMAC không khớp — sai khoá hoặc dữ liệu bị hỏng')

    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, encryptionKey, cipherBytes)
    return new TextDecoder().decode(plainBuf)
  } catch (_e) {
    return value // dữ liệu cũ chưa mã hoá / không giải mã được -> trả nguyên văn
  }
}

export async function decryptNumber(value, fallback = 0) {
  const raw = await decryptValue(value)
  if (raw === null || raw === undefined || String(raw).trim() === '') return fallback
  const n = Number(raw)
  return Number.isNaN(n) ? fallback : n
}

export async function encryptNumber(value) {
  if (value === null || value === undefined || value === '') return null
  return encryptValue(String(Number(value)))
}
