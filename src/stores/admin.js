import { ref, computed } from 'vue'
import { getAdmins, loginAdmin, logoutAdmin, updateProfile as updateProfileApi, changePassword as changePasswordApi } from '../api'

const currentAdmin = ref(null)
const adminList = ref([])
const loading = ref(false)
const sessionToken = ref(null)
const sessionExpiresAt = ref(null)

function clearAuthState() {
  currentAdmin.value = null
  sessionToken.value = null
  sessionExpiresAt.value = null
  localStorage.removeItem('currentAdmin')
  localStorage.removeItem('sessionToken')
  localStorage.removeItem('sessionExpiresAt')
}

const savedAdmin = localStorage.getItem('currentAdmin')
const savedToken = localStorage.getItem('sessionToken')
const savedExpiresAt = localStorage.getItem('sessionExpiresAt')
if (savedAdmin && savedToken) {
  try {
    currentAdmin.value = JSON.parse(savedAdmin)
    sessionToken.value = savedToken

    if (savedExpiresAt) {
      const expires = new Date(savedExpiresAt)
      if (Number.isNaN(expires.getTime()) || Date.now() >= expires.getTime()) {
        clearAuthState()
      } else {
        sessionExpiresAt.value = expires.toISOString()
      }
    }
  } catch (e) {
    clearAuthState()
  }
}

function checkSession() {
  if (!currentAdmin.value || !sessionToken.value) return false
  if (sessionExpiresAt.value) {
    const expiresAtMs = new Date(sessionExpiresAt.value).getTime()
    if (!Number.isNaN(expiresAtMs) && Date.now() >= expiresAtMs) {
      clearAuthState()
      return false
    }
  }
  return true
}

const isLoggedIn = computed(() => currentAdmin.value !== null && checkSession())
const isSuperadmin = computed(() => currentAdmin.value?.is_superadmin === true)
const adminNama = computed(() => currentAdmin.value?.nama || '')
const adminNickname = computed(() => currentAdmin.value?.nickname || currentAdmin.value?.nama?.split(' ')[0] || '')
const adminId = computed(() => currentAdmin.value?.id || null)
const passwordExpired = computed(() => currentAdmin.value?.password_expired === true)
const sessionTimeLeft = computed(() => {
  if (!sessionExpiresAt.value) return 0
  const expiresAtMs = new Date(sessionExpiresAt.value).getTime()
  if (Number.isNaN(expiresAtMs)) return 0
  return Math.max(0, expiresAtMs - Date.now())
})

function getGreeting() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 11) return 'Selamat Pagi'
  if (hour >= 11 && hour < 15) return 'Selamat Siang'
  if (hour >= 15 && hour < 18) return 'Selamat Sore'
  return 'Selamat Malam'
}

const greeting = computed(() => {
  if (!adminNickname.value) return ''
  return `${getGreeting()}, ${adminNickname.value}!`
})

async function fetchAdmins() {
  loading.value = true
  try {
    const res = await getAdmins()
    adminList.value = res.data
  } catch (err) {
    console.error('Failed to fetch admins:', err)
  } finally {
    loading.value = false
  }
}

async function login(adminIdParam, password) {
  loading.value = true
  try {
    const res = await loginAdmin(adminIdParam, password)
    currentAdmin.value = res.data.admin
    sessionToken.value = res.data.session_token || res.data.token || res.data.sessionToken || null
    sessionExpiresAt.value = res.data.session_expires_at || null

    if (!sessionToken.value) {
      clearAuthState()
      const responseKeys = res.data && typeof res.data === 'object' ? Object.keys(res.data).join(', ') : 'unknown'
      return { success: false, error: `Token sesi tidak diterima dari server. Keys response: ${responseKeys}` }
    }

    localStorage.setItem('currentAdmin', JSON.stringify(res.data.admin))
    localStorage.setItem('sessionToken', sessionToken.value)
    if (sessionExpiresAt.value) {
      localStorage.setItem('sessionExpiresAt', sessionExpiresAt.value)
    } else {
      localStorage.removeItem('sessionExpiresAt')
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Login gagal' }
  } finally {
    loading.value = false
  }
}

async function logout() {
  if (sessionToken.value) {
    try {
      await logoutAdmin()
    } catch (err) {}
  }
  clearAuthState()
  window.location.href = '/admin/login'
}

async function updateProfile(data) {
  if (!currentAdmin.value) return { success: false, error: 'Tidak ada admin yang login' }
  loading.value = true
  try {
    const res = await updateProfileApi(currentAdmin.value.id, data)
    currentAdmin.value = { ...currentAdmin.value, ...res.data.admin }
    localStorage.setItem('currentAdmin', JSON.stringify(currentAdmin.value))
    return { success: true }
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Gagal mengupdate profil' }
  } finally {
    loading.value = false
  }
}

async function changePassword(oldPassword, newPassword) {
  if (!currentAdmin.value) return { success: false, error: 'Tidak ada admin yang login' }
  loading.value = true
  try {
    await changePasswordApi(currentAdmin.value.id, oldPassword, newPassword)
    currentAdmin.value = { ...currentAdmin.value, password_expired: false, password_changed_at: new Date().toISOString() }
    localStorage.setItem('currentAdmin', JSON.stringify(currentAdmin.value))
    return { success: true }
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Gagal mengubah password' }
  } finally {
    loading.value = false
  }
}

export function useAdmin() {
  return {
    currentAdmin,
    adminList,
    loading,
    isLoggedIn,
    isSuperadmin,
    adminNama,
    adminNickname,
    adminId,
    passwordExpired,
    sessionTimeLeft,
    greeting,
    checkSession,
    fetchAdmins,
    login,
    logout,
    updateProfile,
    changePassword
  }
}
