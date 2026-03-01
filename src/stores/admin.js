import { ref, computed } from 'vue'
import { getAdmins, loginAdmin, logoutAdmin, updateProfile as updateProfileApi, changePassword as changePasswordApi } from '../api'

const SESSION_DURATION = 10 * 60 * 60 * 1000

const currentAdmin = ref(null)
const adminList = ref([])
const loading = ref(false)
const loginTimestamp = ref(null)

const savedAdmin = localStorage.getItem('currentAdmin')
const savedTimestamp = localStorage.getItem('loginTimestamp')
if (savedAdmin && savedTimestamp) {
  try {
    const timestamp = parseInt(savedTimestamp)
    if (Date.now() - timestamp < SESSION_DURATION) {
      currentAdmin.value = JSON.parse(savedAdmin)
      loginTimestamp.value = timestamp
    } else {
      localStorage.removeItem('currentAdmin')
      localStorage.removeItem('loginTimestamp')
    }
  } catch (e) {
    localStorage.removeItem('currentAdmin')
    localStorage.removeItem('loginTimestamp')
  }
}

function checkSession() {
  if (!loginTimestamp.value) return false
  if (Date.now() - loginTimestamp.value >= SESSION_DURATION) {
    logout()
    return false
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
  if (!loginTimestamp.value) return 0
  return Math.max(0, SESSION_DURATION - (Date.now() - loginTimestamp.value))
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
    loginTimestamp.value = Date.now()
    localStorage.setItem('currentAdmin', JSON.stringify(res.data.admin))
    localStorage.setItem('loginTimestamp', loginTimestamp.value.toString())
    return { success: true }
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Login gagal' }
  } finally {
    loading.value = false
  }
}

async function logout() {
  if (currentAdmin.value) {
    try {
      await logoutAdmin(currentAdmin.value.id, currentAdmin.value.nama)
    } catch (err) {}
  }
  currentAdmin.value = null
  loginTimestamp.value = null
  localStorage.removeItem('currentAdmin')
  localStorage.removeItem('loginTimestamp')
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
