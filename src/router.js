import { createRouter, createWebHistory } from 'vue-router'

// Public pages
import PublicCatalog from './pages/PublicCatalog.vue'

// Admin pages
import AdminLogin from './pages/AdminLogin.vue'
import Dashboard from './pages/Dashboard.vue'
import AdminCatalog from './pages/AdminCatalog.vue'
import BookDetail from './pages/BookDetail.vue'
import BookForm from './pages/BookForm.vue'
import Loans from './pages/Loans.vue'
import Inventory from './pages/Inventory.vue'
import ActivityLogs from './pages/ActivityLogs.vue'
import AdminProfile from './pages/AdminProfile.vue'
import UpdatePosisi from './pages/UpdatePosisi.vue'
import LoanRequests from './pages/LoanRequests.vue'
import DeleteRequests from './pages/DeleteRequests.vue'
import AdminPanel from './pages/AdminPanel.vue'
import KelolaKategori from './pages/KelolaKategori.vue'

const routes = [
  // Public routes
  {
    path: '/',
    name: 'PublicCatalog',
    component: PublicCatalog,
    meta: { public: true }
  },
  // Loan request redirect → ke catalog (form pengajuan ada di halaman buku)
  {
    path: '/loan-request/:book_id',
    redirect: to => ({ path: '/', query: { loan: to.params.book_id } })
  },

  // Admin login
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: AdminLogin,
    meta: { public: true }
  },

  // Admin routes
  {
    path: '/admin',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/admin/books',
    name: 'AdminCatalog',
    component: AdminCatalog
  },
  {
    path: '/admin/books/add',
    name: 'BookAdd',
    component: BookForm
  },
  {
    path: '/admin/books/:id',
    name: 'BookDetail',
    component: BookDetail
  },
  {
    path: '/admin/books/:id/edit',
    name: 'BookEdit',
    component: BookForm
  },
  {
    path: '/admin/loans',
    name: 'Loans',
    component: Loans
  },
  {
    path: '/admin/loan-requests',
    name: 'LoanRequests',
    component: LoanRequests
  },
  {
    path: '/admin/update-posisi',
    name: 'UpdatePosisi',
    component: UpdatePosisi
  },
  {
    path: '/admin/inventory',
    name: 'Inventory',
    component: Inventory
  },
  {
    path: '/admin/logs',
    name: 'ActivityLogs',
    component: ActivityLogs
  },
  {
    path: '/admin/profile',
    name: 'AdminProfile',
    component: AdminProfile
  },

  // Superadmin-only routes
  {
    path: '/admin/delete-requests',
    name: 'DeleteRequests',
    component: DeleteRequests,
    meta: { superadminOnly: true }
  },
  {
    path: '/admin/panel',
    name: 'AdminPanel',
    component: AdminPanel,
    meta: { superadminOnly: true }
  },

  // Kelola Kategori (admin & superadmin)
  {
    path: '/admin/kategori',
    name: 'KelolaKategori',
    component: KelolaKategori
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard - check auth for admin routes
router.beforeEach((to, from, next) => {
  if (!to.meta.public) {
    const savedAdmin = localStorage.getItem('currentAdmin')
    const savedTimestamp = localStorage.getItem('loginTimestamp')

    if (!savedAdmin || !savedTimestamp) {
      return next({ name: 'AdminLogin', query: { redirect: to.fullPath } })
    }

    const timestamp = parseInt(savedTimestamp)
    const now = Date.now()
    const SESSION_DURATION = 10 * 60 * 60 * 1000 // 10 hours

    if (now - timestamp >= SESSION_DURATION) {
      localStorage.removeItem('currentAdmin')
      localStorage.removeItem('loginTimestamp')
      return next({ name: 'AdminLogin', query: { expired: 'true', redirect: to.fullPath } })
    }

    // Guard superadmin-only routes
    if (to.meta.superadminOnly) {
      try {
        const admin = JSON.parse(savedAdmin)
        if (!admin.is_superadmin) {
          return next({ name: 'Dashboard' })
        }
      } catch (e) {
        return next({ name: 'AdminLogin' })
      }
    }
  }

  next()
})

export default router
