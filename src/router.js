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

const routes = [
  // Public route - untuk embed di website prodi
  {
    path: '/',
    name: 'PublicCatalog',
    component: PublicCatalog,
    meta: { public: true }
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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard - check auth for admin routes
router.beforeEach((to, from, next) => {
  // Check if route requires auth (non-public routes)
  if (!to.meta.public) {
    // Check localStorage for valid session
    const savedAdmin = localStorage.getItem('currentAdmin')
    const savedTimestamp = localStorage.getItem('loginTimestamp')
    
    if (!savedAdmin || !savedTimestamp) {
      // No session, redirect to login
      return next({ name: 'AdminLogin', query: { redirect: to.fullPath } })
    }
    
    // Check if session is still valid (10 hours)
    const timestamp = parseInt(savedTimestamp)
    const now = Date.now()
    const SESSION_DURATION = 10 * 60 * 60 * 1000 // 10 hours
    
    if (now - timestamp >= SESSION_DURATION) {
      // Session expired, clear and redirect
      localStorage.removeItem('currentAdmin')
      localStorage.removeItem('loginTimestamp')
      return next({ name: 'AdminLogin', query: { expired: 'true', redirect: to.fullPath } })
    }
  }
  
  next()
})

export default router
