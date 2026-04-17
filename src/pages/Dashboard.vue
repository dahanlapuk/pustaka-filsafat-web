<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getDashboardStats, getTopCategories, getRecentLoans, getRecentActivity, getActivityLogs, getLoanRequests, getDeleteRequests } from '../api'
import { useAdmin } from '../stores/admin'

const router = useRouter()
const { greeting, passwordExpired, currentAdmin, isSuperadmin } = useAdmin()

const stats = ref({
  total_books: 0,
  total_qty: 0,
  borrowed: 0,
  available: 0,
  total_categories: 0,
  without_code: 0,
  inventory_checked: 0,
  checked_today: 0
})

const topCategories = ref([])
const recentLoans = ref([])
const recentActivity = ref([])
const activityLogs = ref([])
const pendingLoanRequests = ref(0)
const pendingDeleteRequests = ref(0)
const loading = ref(true)

const loadDashboard = async () => {
  loading.value = true
  try {
    const [statsRes, catRes, loansRes, actRes, logsRes, loanReqRes] = await Promise.all([
      getDashboardStats(),
      getTopCategories(),
      getRecentLoans(),
      getRecentActivity(),
      getActivityLogs({ limit: 10 }),
      getLoanRequests('pending'),
    ])
    stats.value = statsRes.data
    topCategories.value = catRes.data || []
    recentLoans.value = loansRes.data || []
    recentActivity.value = actRes.data || []
    activityLogs.value = logsRes.data || []
    pendingLoanRequests.value = (loanReqRes.data || []).length

    // Load delete requests hanya jika superadmin
    if (currentAdmin.value?.is_superadmin) {
      try {
        const delRes = await getDeleteRequests('pending')
        pendingDeleteRequests.value = (delRes.data || []).length
      } catch {}
    }
  } catch (err) {
    console.error('Failed to load dashboard:', err)
  } finally {
    loading.value = false
  }
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short'
  })
}

const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const actionLabel = (action) => {
  const labels = {
    'CREATE': 'Tambah',
    'UPDATE': 'Ubah',
    'DELETE': 'Hapus',
    'DELETE_REQUEST': 'Request Hapus',
    'POSITION_CHANGE': 'Ubah Posisi',
    'INVENTORY_CHECK': 'Absen',
    'LOGIN': 'Login'
  }
  return labels[action] || action
}

const actionIcon = (action) => {
  const icons = {
    'CREATE': '➕',
    'UPDATE': '✏️',
    'DELETE': '🗑️',
    'DELETE_REQUEST': '⚠️',
    'POSITION_CHANGE': '📍',
    'INVENTORY_CHECK': '✅',
    'LOGIN': '🔐'
  }
  return icons[action] || '📋'
}

const goTo = (path) => {
  router.push(path)
}

onMounted(loadDashboard)
</script>

<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div class="greeting-section">
        <h1>{{ greeting }}</h1>
        <p>Pustaka Filsafat - Program Studi Ilmu Filsafat FIB UI</p>
      </div>
      <RouterLink to="/admin/profile" class="profile-link">
        Profil
      </RouterLink>
    </div>

    <!-- Password Expiry Warning -->
    <div v-if="passwordExpired" class="alert alert-warning">
      <RouterLink to="/admin/profile">
        Password Anda sudah kadaluarsa! Klik di sini untuk mengubah password.
      </RouterLink>
    </div>

    <div v-if="loading" class="loading">Memuat dashboard...</div>

    <div v-else>
      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card" @click="goTo('/admin/catalog')">
          <div class="stat-icon">📚</div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.total_books }}</span>
            <span class="stat-label">Total Buku</span>
          </div>
        </div>
        
        <div class="stat-card" @click="goTo('/admin/loans')">
          <div class="stat-icon">📖</div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.borrowed }}</span>
            <span class="stat-label">Dipinjam</span>
          </div>
        </div>
        
        <div class="stat-card available">
          <div class="stat-icon">✓</div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.available }}</span>
            <span class="stat-label">Tersedia</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🏷️</div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.total_categories }}</span>
            <span class="stat-label">Kategori</span>
          </div>
        </div>
      </div>

      <!-- Secondary Stats -->
      <div class="secondary-stats">
        <div class="mini-stat" @click="goTo('/admin/inventory')">
          <span class="mini-value">{{ stats.inventory_checked }}</span>
          <span class="mini-label">Sudah Dicek Inventory</span>
        </div>
        <div class="mini-stat">
          <span class="mini-value">{{ stats.checked_today }}</span>
          <span class="mini-label">Dicek Hari Ini</span>
        </div>
        <div class="mini-stat warning">
          <span class="mini-value">{{ stats.without_code }}</span>
          <span class="mini-label">Tanpa Kode</span>
        </div>
      </div>

      <!-- Content Grid -->
      <div class="content-grid">
        <!-- Top Categories -->
        <section class="card">
          <h2>Kategori Terbanyak</h2>
          <div class="category-list">
            <div 
              v-for="(cat, idx) in topCategories" 
              :key="cat.nama" 
              class="category-item"
            >
              <span class="category-rank">{{ idx + 1 }}</span>
              <span class="category-name">{{ cat.nama }}</span>
              <span class="category-count">{{ cat.count }}</span>
            </div>
          </div>
        </section>

        <!-- Recent Loans -->
        <section class="card">
          <div class="card-header">
            <h2>Peminjaman Aktif</h2>
            <button class="btn-link" @click="goTo('/admin/loans')">Lihat Semua →</button>
          </div>
          <div v-if="recentLoans.length === 0" class="empty-card">
            Tidak ada peminjaman aktif
          </div>
          <div v-else class="loan-list">
            <div v-for="loan in recentLoans" :key="loan.id" class="loan-item">
              <div class="loan-info">
                <span class="loan-book">{{ loan.judul_buku }}</span>
                <span class="loan-borrower">{{ loan.nama_peminjam }}</span>
              </div>
              <span class="loan-date">{{ formatDate(loan.tanggal_pinjam) }}</span>
            </div>
          </div>
        </section>

        <!-- Recent Activity -->
        <section class="card">
          <h2>Aktivitas Terbaru</h2>
          <div v-if="recentActivity.length === 0" class="empty-card">
            Belum ada aktivitas
          </div>
          <div v-else class="activity-list">
            <div v-for="(act, idx) in recentActivity" :key="idx" class="activity-item">
              <span class="activity-icon">
                {{ act.type === 'book_added' ? '📗' : '✅' }}
              </span>
              <div class="activity-content">
                <span class="activity-title">{{ act.title }}</span>
                <span class="activity-meta">
                  {{ act.type === 'book_added' ? 'Ditambahkan' : 'Dicek oleh ' + (act.actor || '-') }}
                  • {{ formatDate(act.time) }}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <h2>Aksi Cepat</h2>
        <div class="action-buttons">
          <button class="action-btn" @click="goTo('/admin/books/add')">
            <span class="action-icon">+</span>
            Tambah Buku
          </button>
          <button class="action-btn" @click="goTo('/admin/loans')">
            <span class="action-icon">📋</span>
            Catat Peminjaman
          </button>
          <button class="action-btn" @click="goTo('/admin/update-posisi')">
            <span class="action-icon">📍</span>
            Update Posisi
          </button>
          <button class="action-btn" @click="goTo('/admin/inventory')">
            <span class="action-icon">📦</span>
            Absen Buku
          </button>
          <button class="action-btn" @click="goTo('/admin/books')">
            <span class="action-icon">🔍</span>
            Cari Buku
          </button>
        </div>
      </div>

      <!-- Pengajuan Peminjaman & Superadmin Actions -->
      <div class="secondary-actions">
        <div class="action-card" @click="goTo('/admin/loan-requests')">
          <div class="action-card-header">
            <span class="action-card-icon">📥</span>
            <h3>Pengajuan Peminjaman</h3>
            <span v-if="pendingLoanRequests > 0" class="badge-pending">{{ pendingLoanRequests }}</span>
          </div>
          <p>Tinjau dan proses pengajuan pinjam dari pengunjung</p>
        </div>

        <template v-if="isSuperadmin">
          <div class="action-card danger" @click="goTo('/admin/delete-requests')">
            <div class="action-card-header">
              <span class="action-card-icon">🗑️</span>
              <h3>Pengajuan Hapus Buku</h3>
              <span v-if="pendingDeleteRequests > 0" class="badge-pending danger">{{ pendingDeleteRequests }}</span>
            </div>
            <p>Setujui atau tolak pengajuan penghapusan buku dari admin</p>
          </div>
          <div class="action-card" @click="goTo('/admin/panel')">
            <div class="action-card-header">
              <span class="action-card-icon">👥</span>
              <h3>Kelola Admin</h3>
            </div>
            <p>Buat, edit, dan hapus akun admin perpustakaan</p>
          </div>
        </template>
      </div>

      <!-- Activity Logs -->
      <section class="card logs-card">
        <div class="card-header">
          <h2>Log Aktivitas Admin</h2>
          <button class="btn-link" @click="goTo('/admin/logs')">Lihat Semua →</button>
        </div>
        <div v-if="activityLogs.length === 0" class="empty-card">
          Belum ada log aktivitas
        </div>
        <div v-else class="logs-list">
          <div v-for="log in activityLogs" :key="log.id" class="log-item">
            <span class="log-icon">{{ actionIcon(log.action) }}</span>
            <div class="log-content">
              <div class="log-main">
                <span class="log-action">{{ actionLabel(log.action) }}</span>
                <span v-if="log.entity_name" class="log-entity">{{ log.entity_name }}</span>
              </div>
              <div class="log-meta">
                <span class="log-admin">{{ log.admin_nama }}</span>
                <span class="log-time">{{ formatDateTime(log.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.greeting-section h1 {
  font-family: var(--font-heading);
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.greeting-section p {
  color: var(--gray);
  font-size: 0.875rem;
}

.profile-link {
  padding: 0.5rem 1rem;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius);
  font-size: 0.875rem;
  color: var(--gray-700);
  text-decoration: none;
  transition: all 0.2s;
}

.profile-link:hover {
  background: var(--gray-100);
  border-color: var(--gray-400);
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  margin-bottom: 1rem;
}

.alert-warning {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
}

.alert-warning a {
  color: inherit;
  text-decoration: underline;
}

.loading {
  text-align: center;
  padding: 4rem;
  color: var(--gray);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat-card {
  background: var(--white);
  border: 2px solid var(--border);
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.stat-card:hover {
  border-color: var(--black);
  transform: translateY(-2px);
}

.stat-card.available {
  border-color: var(--success);
  background: var(--success-bg);
}

.stat-icon {
  font-size: 2rem;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--gray);
  margin-top: 0.25rem;
}

/* Secondary Stats */
.secondary-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.mini-stat {
  flex: 1;
  background: var(--white);
  border: 1px solid var(--border);
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.mini-stat:hover {
  border-color: var(--black);
}

.mini-stat.warning {
  border-color: var(--warning, #ff9800);
  background: var(--warning-bg, #fff3e0);
}

.mini-value {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: 700;
}

.mini-label {
  font-size: 0.875rem;
  color: var(--gray);
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.card {
  background: var(--white);
  border: 1px solid var(--border);
  padding: 1.5rem;
}

.card h2 {
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-header h2 {
  margin-bottom: 0;
}

.btn-link {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-link:hover {
  text-decoration: underline;
}

.empty-card {
  color: var(--gray);
  font-size: 0.875rem;
  text-align: center;
  padding: 2rem;
}

/* Category List */
.category-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.category-item:last-child {
  border-bottom: none;
}

.category-rank {
  width: 24px;
  height: 24px;
  background: var(--black);
  color: var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

.category-name {
  flex: 1;
  font-size: 0.875rem;
}

.category-count {
  font-family: var(--font-heading);
  font-weight: 600;
}

/* Loan List */
.loan-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.loan-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}

.loan-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.loan-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.loan-book {
  font-size: 0.875rem;
  font-weight: 500;
}

.loan-borrower {
  font-size: 0.75rem;
  color: var(--gray);
}

.loan-date {
  font-size: 0.75rem;
  color: var(--gray);
}

/* Activity List */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.activity-item {
  display: flex;
  gap: 0.75rem;
}

.activity-icon {
  font-size: 1rem;
}

.activity-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.activity-title {
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.3;
}

.activity-meta {
  font-size: 0.75rem;
  color: var(--gray);
}

/* Quick Actions */
.quick-actions {
  background: var(--white);
  border: 1px solid var(--border);
  padding: 1.5rem;
}

.quick-actions h2 {
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.action-buttons {
  display: flex;
  gap: 1rem;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--black);
  color: var(--white);
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.action-btn:hover {
  background: var(--accent);
}

.action-icon {
  font-size: 1.25rem;
}

/* Responsive */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .secondary-stats {
    flex-direction: column;
  }
  
  .action-buttons {
    flex-direction: column;
  }
}

/* Activity Logs */
.logs-card {
  margin-top: var(--space-5);
}

/* Secondary Actions (Pengajuan + Superadmin) */
.secondary-actions {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
  margin-bottom: 2rem;
}

.action-card {
  background: var(--white);
  border: 1px solid var(--border);
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-card:hover {
  border-color: var(--black);
  transform: translateY(-1px);
}

.action-card.danger {
  border-color: var(--danger-border, #fecaca);
  background: var(--danger-bg);
}

.action-card.danger:hover {
  border-color: var(--danger);
}

.action-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.action-card-icon {
  font-size: 1.25rem;
}

.action-card-header h3 {
  font-family: var(--font-heading);
  font-size: 0.9rem;
  font-weight: 700;
  flex: 1;
}

.action-card p {
  font-size: 0.8rem;
  color: var(--gray);
  line-height: 1.5;
}

.badge-pending {
  background: var(--black);
  color: var(--white);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 99px;
  min-width: 20px;
  text-align: center;
}

.badge-pending.danger {
  background: var(--danger);
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.log-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  border-bottom: 1px solid var(--gray-100);
}

.log-item:last-child {
  border-bottom: none;
}

.log-icon {
  font-size: 1rem;
  width: 24px;
  text-align: center;
}

.log-content {
  flex: 1;
}

.log-main {
  display: flex;
  gap: var(--space-2);
  align-items: baseline;
}

.log-action {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: var(--gray-100);
  padding: 2px 6px;
}

.log-entity {
  font-weight: 500;
  color: var(--black);
}

.log-meta {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-1);
  font-size: 0.75rem;
  color: var(--gray-500);
}

.log-admin {
  font-weight: 500;
  color: var(--gray-600);
}
</style>
