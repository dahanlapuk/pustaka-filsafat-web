<script setup>
import { ref, onMounted } from 'vue'
import { getLoanRequests, approveLoanRequest, rejectLoanRequest } from '../api'
import { useAdmin } from '../stores/admin'

const { currentAdmin } = useAdmin()
const requests     = ref([])
const loading      = ref(true)
const activeTab    = ref('pending')
const processingId = ref(null)
const rejectModal  = ref({ show: false, id: null, catatan: '' })
const toast        = ref(null)

const load = async () => {
  loading.value = true
  try {
    const res = await getLoanRequests(activeTab.value)
    requests.value = res.data || []
  } finally {
    loading.value = false
  }
}

onMounted(load)

const switchTab = (tab) => { activeTab.value = tab; load() }

const approve = async (id, namaPemohon) => {
  if (!confirm(`Setujui pengajuan dari ${namaPemohon}?`)) return
  processingId.value = id
  try {
    await approveLoanRequest(id, {
      admin_id: currentAdmin.value?.id,
      admin_nama: currentAdmin.value?.nama
    })
    showToast('Pengajuan disetujui & peminjaman dicatat')
    load()
  } catch (e) {
    showToast(e.response?.data?.error || 'Gagal menyetujui', 'error')
  } finally {
    processingId.value = null
  }
}

const openRejectModal = (id) => {
  rejectModal.value = { show: true, id, catatan: '' }
}

const submitReject = async () => {
  try {
    await rejectLoanRequest(rejectModal.value.id, {
      admin_id: currentAdmin.value?.id,
      admin_nama: currentAdmin.value?.nama,
      catatan_admin: rejectModal.value.catatan,
    })
    rejectModal.value.show = false
    showToast('Pengajuan ditolak')
    load()
  } catch (e) {
    showToast(e.response?.data?.error || 'Gagal menolak', 'error')
  }
}

const showToast = (msg, type = 'success') => {
  toast.value = { msg, type }
  setTimeout(() => { toast.value = null }, 3000)
}

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

const tabLabel = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' }
</script>

<template>
  <div class="page-wrap" style="padding: 1.5rem;">
    <!-- Toast -->
    <Transition name="toast-fade">
      <div v-if="toast" :class="`toast toast-${toast.type}`">{{ toast.msg }}</div>
    </Transition>

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Pengajuan Peminjaman</h1>
        <p class="page-subtitle">Kelola permintaan peminjaman dari pengunjung</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        v-for="tab in ['pending','approved','rejected']"
        :key="tab"
        class="tab"
        :class="{ active: activeTab === tab }"
        @click="switchTab(tab)"
      >
        {{ tabLabel[tab] }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">Memuat pengajuan...</div>

    <!-- Empty -->
    <div v-else-if="requests.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <div class="empty-text">Tidak ada pengajuan {{ tabLabel[activeTab].toLowerCase() }}</div>
    </div>

    <!-- Desktop Table -->
    <div v-else class="table-wrap table-mobile-hide">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th>Pemohon</th>
            <th>Buku</th>
            <th>Kontak</th>
            <th>Keperluan</th>
            <th class="col-date">Tanggal</th>
            <th v-if="activeTab === 'pending'" style="width: 160px;">Aksi</th>
            <th v-else>Catatan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in requests" :key="r.id">
            <td class="col-id">#{{ r.id }}</td>
            <td style="font-weight: 500;">{{ r.nama_pemohon }}</td>
            <td style="max-width: 200px;">{{ r.judul_buku }}</td>
            <td style="font-size: 0.8rem; line-height: 1.8;">
              <div v-if="r.whatsapp">📱 {{ r.whatsapp }}</div>
              <div v-if="r.email">✉ {{ r.email }}</div>
            </td>
            <td style="color: var(--text-secondary); font-size: 0.85rem;">{{ r.keperluan || '—' }}</td>
            <td class="col-date">{{ formatDate(r.created_at) }}</td>
            <td v-if="activeTab === 'pending'" class="col-actions">
              <div style="display: flex; gap: 0.5rem;">
                <button
                  class="btn btn-approve"
                  :disabled="processingId === r.id"
                  @click="approve(r.id, r.nama_pemohon)"
                >✓ Setujui</button>
                <button class="btn btn-reject" @click="openRejectModal(r.id)">✗ Tolak</button>
              </div>
            </td>
            <td v-else style="font-size: 0.85rem; color: var(--text-secondary);">
              {{ r.catatan_admin || '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards -->
    <div class="card-mobile-show" v-if="!loading && requests.length > 0">
      <div v-for="r in requests" :key="r.id" class="mobile-card">
        <div class="mobile-card-title">{{ r.nama_pemohon }}</div>
        <div class="mobile-card-meta">
          📚 {{ r.judul_buku }}<br>
          <span v-if="r.whatsapp">📱 {{ r.whatsapp }}</span>
          <span v-if="r.email"> ✉ {{ r.email }}</span><br>
          <span class="col-date">{{ formatDate(r.created_at) }}</span>
        </div>
        <div class="mobile-card-actions" v-if="activeTab === 'pending'">
          <button class="btn btn-approve btn-sm" @click="approve(r.id, r.nama_pemohon)">✓ Setujui</button>
          <button class="btn btn-reject btn-sm" @click="openRejectModal(r.id)">✗ Tolak</button>
        </div>
      </div>
    </div>

    <!-- Modal Tolak -->
    <Transition name="modal-fade">
      <div v-if="rejectModal.show" class="modal-overlay" @click.self="rejectModal.show = false">
        <div class="modal">
          <h2 class="modal-title">Tolak Pengajuan</h2>
          <div class="form-group">
            <label class="form-label">Catatan untuk pemohon (opsional)</label>
            <textarea
              v-model="rejectModal.catatan"
              rows="3"
              placeholder="Misal: buku sedang tidak tersedia, silakan coba lagi nanti..."
            ></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="rejectModal.show = false">Batal</button>
            <button class="btn btn-accent" @click="submitReject">Tolak Pengajuan</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.3s; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(1rem); }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
