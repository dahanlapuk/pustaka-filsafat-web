import axios from 'axios'

// Production: Render backend
// Development: localhost:3000
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
const BASE_URL = import.meta.env.VITE_API_URL
  || (isLocal
    ? `http://localhost:3000/api`
    : 'https://pustaka-filsafat-api.onrender.com/api')

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const sessionToken = localStorage.getItem('sessionToken')
  if (sessionToken) config.headers['X-Session-Token'] = sessionToken
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('currentAdmin')
      localStorage.removeItem('sessionToken')
      localStorage.removeItem('sessionExpiresAt')
      if (!window.location.pathname.includes('/admin/login')) {
        window.location.href = '/admin/login?expired=true'
      }
    }
    return Promise.reject(error)
  }
)

export const getBooks = (params = {}) => api.get('/books', { params })
export const searchBooks = (q, page = 1, limit = 20, extraParams = {}) =>
  api.get('/books/search', { params: { q, page, limit, ...extraParams } })
export const getBook = (id) => api.get(`/books/${id}`)
export const createBook = (data) => api.post('/books', data)
export const updateBook = (id, data) => api.put(`/books/${id}`, data)
export const deleteBook = (id, adminId, adminNama, confirm = false, alasan = '') => 
  api.delete(`/books/${id}`, { params: { admin_id: adminId, admin_nama: adminNama, confirm, alasan } })

export const getCategories = () => api.get('/categories')
export const createCategory = (data) => api.post('/categories', data)
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data)
export const deleteCategory = (id, data) => api.delete(`/categories/${id}`, { data })

export const getCategoryRequests = (status = 'pending') => api.get('/category-requests', { params: { status } })
export const createCategoryRequest = (data) => api.post('/category-requests', data)
export const approveCategoryRequest = (id, data) => api.put(`/category-requests/${id}/approve`, data)
export const rejectCategoryRequest = (id, data) => api.put(`/category-requests/${id}/reject`, data)

export const getPosisi = () => api.get('/posisi')
export const getPosisiStruktur = () => api.get('/posisi/struktur')

export const getLoans = (all = false) => api.get('/loans', { params: { all } })
export const getLoanDetail = (id) => api.get(`/loans/${id}`)
export const getLoanAuditSummary = () => api.get('/loans/audit/summary')
export const getLoanAuditHistory = (params = {}) => api.get('/loans/audit/history', { params })
export const createLoan = (data) => api.post('/loans', data)
export const returnLoan = (id) => api.put(`/loans/${id}/return`)

export const getInventoryStats = () => api.get('/inventory/stats')
export const getBooksByPosisi = (posisiId) => api.get(`/inventory/posisi/${posisiId}`)
export const checkInventory = (data) => api.post('/inventory/check', data)
export const transferInventory = (data) => api.post('/inventory/transfer', data)
export const startStocktakeSession = (data = {}) => api.post('/inventory/stocktake/sessions', data)
export const addStocktakeEntry = (sessionId, data) => api.post(`/inventory/stocktake/${sessionId}/entries`, data)
export const getStocktakeSession = (sessionId) => api.get(`/inventory/stocktake/${sessionId}`)
export const closeStocktakeSession = (sessionId) => api.put(`/inventory/stocktake/${sessionId}/close`)
export const getBookStockBreakdown = (bookId) => api.get(`/books/${bookId}/stock-breakdown`)
export const updateBookStockBreakdown = (bookId, data) => api.put(`/books/${bookId}/stock-breakdown`, data)
export const getBookStockAvailability = (bookId) => api.get(`/books/${bookId}/stock-availability`)

export const getMembers = (params = {}) => api.get('/members', { params })
export const getMemberProfile = (name) => api.get(`/members/${encodeURIComponent(name)}`)

export const getDashboardStats = () => api.get('/dashboard/stats')
export const getTopCategories = () => api.get('/dashboard/top-categories')
export const getRecentLoans = () => api.get('/dashboard/recent-loans')
export const getRecentActivity = () => api.get('/dashboard/recent-activity')

const encodePassword = (password) => btoa(unescape(encodeURIComponent(password)))

export const getAdmins = () => api.get('/admins')
export const getCurrentAdmin = (adminId) => api.get('/admins/current', { params: { admin_id: adminId } })
export const loginAdmin = (adminId, password) => api.post('/admins/login', { admin_id: adminId, password: encodePassword(password) })
export const logoutAdmin = () => api.post('/admins/logout', {})
export const updateProfile = (adminId, data) => api.put(`/admins/${adminId}/profile`, data)
export const changePassword = (adminId, oldPassword, newPassword) => api.put(`/admins/${adminId}/password`, { old_password: encodePassword(oldPassword), new_password: encodePassword(newPassword) })

export const getActivityLogs = (params = {}) => api.get('/logs', { params })
export const getLogStats = () => api.get('/logs/stats')

// Batch posisi
export const batchUpdatePosisi = (data) => api.put('/books/batch-posisi', data)
export const getBooksWithoutCode = () => api.get('/books/no-code')

// Loan Requests (publik & admin)
export const createLoanRequest = (data) => api.post('/loan-requests', data)
export const getLoanRequests = (status = '') => api.get('/loan-requests', { params: { status } })
export const approveLoanRequest = (id, data) => api.put(`/loan-requests/${id}/approve`, data)
export const rejectLoanRequest = (id, data) => api.put(`/loan-requests/${id}/reject`, data)

// Delete Requests
export const createDeleteRequest = (data) => api.post('/delete-requests', data)
export const getDeleteRequests = (status = 'pending') => api.get('/delete-requests', { params: { status } })
export const approveDeleteRequest = (id, data) => api.put(`/delete-requests/${id}/approve`, data)
export const rejectDeleteRequest = (id, data) => api.put(`/delete-requests/${id}/reject`, data)

// Superadmin — manajemen admin
export const createAdmin = (data) => {
  // Encode password menggunakan handler yang sama seperti login
  if (data.password) {
    return api.post('/admins', {
      ...data,
      password: encodePassword(data.password)
    })
  }
  return api.post('/admins', data)
}
export const updateAdminBySuper = (id, data) => api.put(`/admins/${id}/admin`, data)
export const deleteAdmin = (id, data) => api.delete(`/admins/${id}`, { data })
export const resetAdminPassword = (id, newPassword) => api.put(`/admins/${id}/reset-password`, {
  new_password: encodePassword(newPassword)
})

export default api
