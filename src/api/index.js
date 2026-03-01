import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const savedAdmin = localStorage.getItem('currentAdmin')
  const savedTimestamp = localStorage.getItem('loginTimestamp')

  if (savedAdmin) {
    try {
      const admin = JSON.parse(savedAdmin)
      config.headers['X-Admin-ID'] = admin.id
      if (savedTimestamp) {
        config.headers['X-Session-Start'] = savedTimestamp
      }
    } catch (_) {}
  }

  return config
})

const privateRoutes = [
  '/admins',
  '/logs',
  '/dashboard'
]

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || ""

    const isPrivate = privateRoutes.some(route =>
      url.startsWith(route)
    )

    if (error.response?.status === 401 && isPrivate) {
      localStorage.removeItem('currentAdmin')
      localStorage.removeItem('loginTimestamp')

      if (!window.location.pathname.includes('/admin/login')) {
        window.location.href = '/admin/login?expired=true'
      }
    }

    return Promise.reject(error)
  }
)

export const getBooks = (params = {}) => api.get('/books', { params })
export const searchBooks = (q) => api.get('/books/search', { params: { q } })
export const getBook = (id) => api.get(`/books/${id}`)
export const createBook = (data) => api.post('/books', data)
export const updateBook = (id, data) => api.put(`/books/${id}`, data)
export const deleteBook = (id, adminId, adminNama, confirm = false, alasan = '') =>
  api.delete(`/books/${id}`, {
    params: { admin_id: adminId, admin_nama: adminNama, confirm, alasan }
  })

export const getCategories = () => api.get('/categories')
export const getPosisi = () => api.get('/posisi')

export const getLoans = (all = false) => api.get('/loans', { params: { all } })
export const createLoan = (data) => api.post('/loans', data)
export const returnLoan = (id) => api.put(`/loans/${id}/return`)

export const getInventoryStats = () => api.get('/inventory/stats')
export const getBooksByPosisi = (posisiId) => api.get(`/inventory/posisi/${posisiId}`)
export const checkInventory = (data) => api.post('/inventory/check', data)

export const getDashboardStats = () => api.get('/dashboard/stats')
export const getTopCategories = () => api.get('/dashboard/top-categories')
export const getRecentLoans = () => api.get('/dashboard/recent-loans')
export const getRecentActivity = () => api.get('/dashboard/recent-activity')

const encodePassword = (password) =>
  btoa(unescape(encodeURIComponent(password)))

export const getAdmins = () => api.get('/admins')
export const getCurrentAdmin = (adminId) =>
  api.get('/admins/current', { params: { admin_id: adminId } })

export const loginAdmin = (adminId, password) =>
  api.post('/admins/login', {
    admin_id: adminId,
    password: encodePassword(password)
  })

export const logoutAdmin = (adminId, nama) =>
  api.post('/admins/logout', { admin_id: adminId, nama })

export const updateProfile = (adminId, data) =>
  api.put(`/admins/${adminId}/profile`, data)

export const changePassword = (adminId, oldPassword, newPassword) =>
  api.put(`/admins/${adminId}/password`, {
    old_password: encodePassword(oldPassword),
    new_password: encodePassword(newPassword)
  })

export const getActivityLogs = (params = {}) => api.get('/logs', { params })
export const getLogStats = () => api.get('/logs/stats')

export default api