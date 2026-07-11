import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null) // { hoTen, isAdmin, phongBan, chucVu, maCayXang }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      return
    }
    const metadata = session.user.user_metadata || {}
    // Ép về bool chắc chắn đúng — tránh lỗi "bool('false') == True" từng gặp bên bản Python
    const isAdminRaw = metadata.is_admin
    const isAdmin = typeof isAdminRaw === 'string' ? isAdminRaw.toLowerCase() === 'true' : !!isAdminRaw
    setProfile({
      hoTen: metadata.ho_ten || session.user.email,
      isAdmin,
      phongBan: metadata.phong_ban || null,
      chucVu: metadata.chuc_vu || null,
      maCayXang: metadata.ma_cay_xang || null,
    })
  }, [session])

  async function signIn(email, password) {
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (!result.error) {
      try {
        localStorage.setItem('qlnv_last_email', email)
      } catch (_e) {
        // bỏ qua nếu trình duyệt chặn localStorage
      }
    }
    return result
  }

  async function signOut() {
    return supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        loading: session === undefined,
        ...profile,
        isTruongPhong: profile ? isTruongPhongChucVu(profile.chucVu) : false,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

const TRUONG_PHONG_CHUC_VU = [
  'truong_phong_hanh_chinh',
  'ke_toan_truong',
  'truong_phong_khai_thac',
  'truong_ca_cua_hang',
]
function isTruongPhongChucVu(chucVu) {
  return TRUONG_PHONG_CHUC_VU.includes(chucVu)
}

export function useAuth() {
  return useContext(AuthContext)
}
