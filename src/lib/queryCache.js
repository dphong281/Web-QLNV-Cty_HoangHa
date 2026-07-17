// Cache tạm trong bộ nhớ trình duyệt (mất khi tải lại trang) — dùng cho các câu truy vấn
// Dashboard/báo cáo phải giải mã nhiều trường, đọc lại liên tục khi chuyển qua chuyển lại
// giữa các tab mà dữ liệu gốc không đổi trong vài phút đó.
const cache = new Map()

export function withCache(key, ttlMs, fn) {
  return async (...args) => {
    const cacheKey = args.length ? `${key}:${JSON.stringify(args)}` : key
    const hit = cache.get(cacheKey)
    if (hit && Date.now() - hit.time < ttlMs) return hit.value
    const value = await fn(...args)
    cache.set(cacheKey, { value, time: Date.now() })
    return value
  }
}

// Xoá cache theo tiền tố — gọi sau khi có thay đổi dữ liệu (thêm/sửa/xoá) để lần đọc tiếp
// theo lấy đúng dữ liệu mới thay vì bản cũ còn lưu tạm.
export function invalidateCache(prefix) {
  for (const k of cache.keys()) if (k === prefix || k.startsWith(`${prefix}:`)) cache.delete(k)
}
