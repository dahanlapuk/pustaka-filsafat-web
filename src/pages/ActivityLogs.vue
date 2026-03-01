<script setup>
import { ref, onMounted, computed } from 'vue'
import { getActivityLogs, getLogStats } from '../api'

const logs = ref([])
const stats = ref(null)
const loading = ref(true)
const filter = ref({
  entity_type: '',
  action: ''
})

const entityTypes = ['BOOK', 'CATEGORY', 'POSISI', 'LOAN', 'ADMIN']
const actionTypes = ['CREATE', 'UPDATE', 'DELETE', 'DELETE_REQUEST', 'POSITION_CHANGE', 'INVENTORY_CHECK', 'LOGIN', 'LOGOUT', 'CHANGE_PASSWORD']

onMounted(async () => {
  await Promise.all([fetchLogs(), fetchStats()])
})

async function fetchLogs() {
  loading.value = true
  try {
    const params = {}
    if (filter.value.entity_type) params.entity_type = filter.value.entity_type
    if (filter.value.action) params.action = filter.value.action
    const res = await getActivityLogs(params)
    logs.value = res.data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    const res = await getLogStats()
    stats.value = res.data
  } catch (err) {
    console.error(err)
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function actionLabel(action) {
  const labels = {
    'CREATE': 'Tambah',
    'UPDATE': 'Ubah',
    'DELETE': 'Hapus',
    'DELETE_REQUEST': 'Request Hapus',
    'POSITION_CHANGE': 'Ubah Posisi',
    'INVENTORY_CHECK': 'Absen Buku',
    'LOGIN': 'Login',
    'LOGOUT': 'Logout',
    'CHANGE_PASSWORD': 'Ubah Password',
    'LOGIN_FAILED': 'Login Gagal'
  }
  return labels[action] || action
}

function entityLabel(type) {
  const labels = {
    'BOOK': 'Buku',
    'CATEGORY': 'Kategori',
    'POSISI': 'Posisi',
    'LOAN': 'Peminjaman',
    'ADMIN': 'Admin'
  }
  return labels[type] || type
}

function actionClass(action) {
  const classes = {
    'CREATE': 'badge-create',
    'UPDATE': 'badge-update',
    'DELETE': 'badge-delete',
    'DELETE_REQUEST': 'badge-delete-req',
    'POSITION_CHANGE': 'badge-position',
    'INVENTORY_CHECK': 'badge-inventory',
    'LOGIN': 'badge-login',
    'LOGOUT': 'badge-logout',
    'CHANGE_PASSWORD': 'badge-update',
    'LOGIN_FAILED': 'badge-delete'
  }
  return classes[action] || ''
}

function formatDetails(log) {
  const admin = log.admin_nama || 'Admin'
  const entity = log.entity_name || ''
  
  if (!log.details) {
    if (log.action === 'LOGIN') return `Masuk ke sistem`
    if (log.action === 'LOGOUT') return `Keluar dari sistem`
    if (log.action === 'CHANGE_PASSWORD') return `Mengubah password`
    if (log.action === 'DELETE') return `Menghapus ${entity}`
    if (log.action === 'DELETE_REQUEST') return `Mengajukan hapus ${entity}`
    return null
  }
  
  let d
  try {
    d = typeof log.details === 'string' ? JSON.parse(log.details) : log.details
  } catch {
    return null
  }
  
  // CREATE BOOK
  if (log.action === 'CREATE' && log.entity_type === 'BOOK') {
    if (d.posisi) {
      return `Menambahkan buku di posisi ${d.posisi}`
    }
    return `Menambahkan buku, belum diposisikan`
  }
  
  // CREATE CATEGORY
  if (log.action === 'CREATE' && log.entity_type === 'CATEGORY') {
    return `Menambahkan kategori baru`
  }
  
  // CREATE POSISI
  if (log.action === 'CREATE' && log.entity_type === 'POSISI') {
    if (d.rak) return `Menambahkan posisi baru di rak ${d.rak}`
    return `Menambahkan posisi baru`
  }
  
  // UPDATE BOOK
  if (log.action === 'UPDATE' && log.entity_type === 'BOOK') {
    if (d.old_posisi && d.new_posisi) {
      return `Memindahkan buku dari ${d.old_posisi} ke ${d.new_posisi}`
    }
    if (d.changes) {
      const parts = []
      for (const [key, val] of Object.entries(d.changes)) {
        if (key === 'judul') parts.push(`judul menjadi "${val}"`)
        else if (key === 'posisi') parts.push(`posisi ke ${val}`)
        else if (key === 'qty') parts.push(`qty menjadi ${val}`)
        else if (key === 'kategori') parts.push(`kategori ke ${val}`)
        else parts.push(`${key}`)
      }
      return `Mengubah ${parts.join(', ')}`
    }
    return `Mengubah detail buku`
  }
  
  // UPDATE ADMIN
  if (log.action === 'UPDATE' && log.entity_type === 'ADMIN') {
    if (d.field) return `Memperbarui ${d.field}`
    return `Memperbarui profil`
  }
  
  // POSITION_CHANGE (bulk)
  if (log.action === 'POSITION_CHANGE') {
    if (d.old_posisi && d.new_posisi) {
      return `Memindahkan buku dari ${d.old_posisi} ke ${d.new_posisi}`
    }
    if (d.books_count) return `Memindahkan ${d.books_count} buku`
    return `Mengubah posisi buku`
  }
  
  // INVENTORY_CHECK
  if (log.action === 'INVENTORY_CHECK') {
    if (d.books_count && d.checked_by) {
      return `Mengecek ${d.books_count} buku (oleh ${d.checked_by})`
    }
    if (d.books_count) return `Mengecek ${d.books_count} buku`
    return `Melakukan absen buku`
  }
  
  // DELETE
  if (log.action === 'DELETE') {
    if (d.alasan) return `Menghapus buku, alasan: ${d.alasan}`
    return `Menghapus dari sistem`
  }
  
  // DELETE_REQUEST
  if (log.action === 'DELETE_REQUEST') {
    if (d.alasan) return `Mengajukan hapus, alasan: ${d.alasan}`
    return `Mengajukan penghapusan`
  }
  
  // LOAN
  if (log.entity_type === 'LOAN') {
    if (log.action === 'CREATE' && d.peminjam) {
      return `Dipinjam oleh ${d.peminjam}`
    }
    if (d.returned) return `Dikembalikan`
  }
  
  return null
}
</script>

<template>
  <div class="logs-page">
    <h1 class="page-title">Log Aktivitas</h1>
    <p class="page-subtitle">Riwayat semua aktivitas admin (tidak dapat dihapus)</p>

    <!-- Stats Cards -->
    <div v-if="stats" class="stats-grid">
      <div class="stat-card">
        <span class="stat-value">{{ stats.total_logs }}</span>
        <span class="stat-label">Total Log</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ stats.today_logs }}</span>
        <span class="stat-label">Hari Ini</span>
      </div>
      <div class="stat-card" v-for="(count, action) in stats.action_counts" :key="action">
        <span class="stat-value">{{ count }}</span>
        <span class="stat-label">{{ actionLabel(action) }}</span>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <select v-model="filter.entity_type" @change="fetchLogs" class="form-input">
        <option value="">Semua Entitas</option>
        <option v-for="t in entityTypes" :key="t" :value="t">{{ entityLabel(t) }}</option>
      </select>
      <select v-model="filter.action" @change="fetchLogs" class="form-input">
        <option value="">Semua Aksi</option>
        <option v-for="a in actionTypes" :key="a" :value="a">{{ actionLabel(a) }}</option>
      </select>
    </div>

    <!-- Logs Table -->
    <div v-if="loading" class="loading">
      <p>Memuat log...</p>
    </div>

    <div v-else class="logs-table-wrapper">
      <table class="logs-table">
        <thead>
          <tr>
            <th>Waktu</th>
            <th>Admin</th>
            <th>Aksi</th>
            <th>Entitas</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id">
            <td class="cell-time">{{ formatDate(log.created_at) }}</td>
            <td class="cell-admin">{{ log.admin_nama }}</td>
            <td>
              <span class="badge" :class="actionClass(log.action)">
                {{ actionLabel(log.action) }}
              </span>
            </td>
            <td>
              <span class="entity-type">{{ entityLabel(log.entity_type) }}</span>
              <span v-if="log.entity_name" class="entity-name">{{ log.entity_name }}</span>
            </td>
            <td class="cell-details">
              <span v-if="formatDetails(log)" class="details-text">
                {{ formatDetails(log) }}
              </span>
              <span v-else class="no-details">—</span>
            </td>
          </tr>
          <tr v-if="logs.length === 0">
            <td colspan="5" class="empty-state">Belum ada log aktivitas</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.logs-page {
  padding: var(--space-6);
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 1.75rem;
  margin-bottom: var(--space-2);
}

.page-subtitle {
  color: var(--gray-600);
  margin-bottom: var(--space-5);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.stat-card {
  background: var(--white);
  border: 2px solid var(--black);
  padding: var(--space-4);
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  font-family: var(--font-heading);
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: var(--space-1);
}

.filters {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.filters .form-input {
  width: auto;
  min-width: 180px;
}

.logs-table-wrapper {
  overflow-x: auto;
  background: var(--white);
  border: 2px solid var(--black);
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
}

.logs-table th,
.logs-table td {
  padding: var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--gray-200);
}

.logs-table th {
  background: var(--black);
  color: var(--white);
  font-family: var(--font-heading);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.logs-table tbody tr:hover {
  background: var(--gray-50);
}

.cell-time {
  white-space: nowrap;
  font-size: 0.875rem;
  color: var(--gray-600);
}

.cell-admin {
  font-weight: 500;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge-create { background: #d4edda; color: #155724; }
.badge-update { background: #fff3cd; color: #856404; }
.badge-delete { background: #f8d7da; color: #721c24; }
.badge-delete-req { background: #f5c6cb; color: #721c24; border: 1px dashed #721c24; }
.badge-position { background: #cce5ff; color: #004085; }
.badge-inventory { background: #d1ecf1; color: #0c5460; }
.badge-login { background: #e2e3e5; color: #383d41; }
.badge-logout { background: #d6d8db; color: #1b1e21; }

.entity-type {
  display: block;
  font-size: 0.75rem;
  color: var(--gray-500);
  text-transform: uppercase;
}

.entity-name {
  display: block;
  font-weight: 500;
}

.cell-details {
  max-width: 300px;
}

.details-text {
  font-size: 0.85rem;
  color: var(--gray-700);
}

.no-details {
  color: var(--gray-400);
}

.empty-state {
  text-align: center;
  padding: var(--space-8) !important;
  color: var(--gray-500);
}

.loading {
  text-align: center;
  padding: var(--space-8);
}
</style>
