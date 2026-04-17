<script setup>
import { ref, onMounted } from 'vue'
import { getDeleteRequests, approveDeleteRequest, rejectDeleteRequest } from '../api'
import { useAdmin } from '../stores/admin'

const { currentAdmin } = useAdmin()
const requests     = ref([])
const loading      = ref(true)
const activeTab    = ref('pending')
const processingId = ref(null)
const rejectModal  = ref({ show: false, id: null, catatan: '' })
const toast        = ref(null)

const tabLabel = { pending: '⚠ Menunggu', approved: '✓ Disetujui', rejected: '✗ Ditolak' }

const load = async () => {
  loading.value = true
  try {
    const res = await getDeleteRequests(activeTab.value)
    requests.value = res.data || []
  } finally {
    loading.value = false
  }
}

onMounted(load)

const switchTab = (tab) => { activeTab.value = tab; load() }

const approve = async (id, judul) => {
  if (!confirm(`Setujui penghapusan "${judul}"? Buku akan dihapus permanen.`)) return
  processingId.value = id
  try {
    await approveDeleteRequest(id, {
      admin_id: currentAdmin.value?.id,
      admin_nama: currentAdmin.value?.nama
    })
    showToast('Buku berhasil dihapus')
    load()
  } catch (e) {
    showToast(e.response?.data?.error || 'Gagal menghapus', 'error')
  } finally {
    processingId.value = null
  }
}

const openRejectModal = (id) => {
  rejectModal.value = { show: true, id, catatan: '' }
}

const submitReject = async () => {
  try {
    await rejectDeleteRequest(rejectModal.value.id, {
      admin_id: currentAdmin.value?.id,
      admin_nama: currentAdmin.value?.nama,
      catatan_review: rejectModal.value.catatan,
    })
    rejectModal.value.show = false
    showToast('Pengajuan hapus ditolak')
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
</script>

<template>
  <div class="page-wrap" style="padding: 1.5rem;">
    <Transition name="toast-fade">
      <div v-if="toast" :class="`toast toast-${toast.type}`">{{ toast.msg }}</div>
    </Transition>

    <div class="page-header">
      <div>
        <h1 class="page-title">Pengajuan Penghapusan Buku</h1>
        <p class="page-subtitle">Khusus Superadmin — tinjau dan setujui/tolak pengajuan hapus dari admin</p>
      </div>
    </div>

    <div class="tabs">
      <button
        v-for="tab in ['pending','approved','rejected']"
        :key="tab"
        class="tab"
        :class="{ active: activeTab === tab }"
        @click="switchTab(tab)"
      >{{ tabLabel[tab] }}</button>
    </div>

    <div v-if="loading" class="loading-state">Memuat...</div>
    <div v-else-if="requests.length === 0" class="empty-state">
      <div class="empty-icon">🗂</div>
      <div class="empty-text">
        {{ activeTab === 'pending' ? 'Tidak ada pengajuan yang menunggu' : `Tidak ada pengajuan ${activeTab}` }}
      </div>
    </div>

    <div v-else>
      <!-- Desktop Table -->
      <div class="table-wrap table-mobile-hide">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 50px;">#</th>
              <th>Judul Buku</th>
              <th>Alasan</th>
              <th>Diajukan Oleh</th>
              <th class="col-date">Tanggal</th>
              <th v-if="activeTab === 'pending'" style="width: 160px;">Aksi</th>
              <th v-else>Catatan Review</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in requests" :key="r.id">
              <td class="col-id">#{{ r.id }}</td>
              <td style="font-weight: 600;">{{ r.judul_snapshot }}</td>
              <td style="color: var(--text-secondary); font-size: 0.85rem;">{{ r.alasan }}</td>
              <td>{{ r.requested_by_nama }}</td>
              <td class="col-date">{{ formatDate(r.created_at) }}</td>
              <td v-if="activeTab === 'pending'" class="col-actions">
                <div style="display: flex; gap: 0.5rem;">
                  <button
                    class="btn btn-approve"
                    :disabled="processingId === r.id"
                    @click="approve(r.id, r.judul_snapshot)"
                  >✓ Setujui</button>
                  <button class="btn btn-reject" @click="openRejectModal(r.id)">✗ Tolak</button>
                </div>
              </td>
              <td v-else style="font-size: 0.85rem; color: var(--text-secondary);">
                {{ r.catatan_review || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="card-mobile-show">
        <div v-for="r in requests" :key="r.id" class="mobile-card">
          <div class="mobile-card-title">{{ r.judul_snapshot }}</div>
          <div class="mobile-card-meta">
            Oleh: {{ r.requested_by_nama }}<br>
            Alasan: {{ r.alasan }}<br>
            <span class="col-date">{{ formatDate(r.created_at) }}</span>
          </div>
          <div class="mobile-card-actions" v-if="activeTab === 'pending'">
            <button class="btn btn-approve btn-sm" @click="approve(r.id, r.judul_snapshot)">✓ Setujui</button>
            <button class="btn btn-reject btn-sm" @click="openRejectModal(r.id)">✗ Tolak</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Tolak -->
    <Transition name="modal-fade">
      <div v-if="rejectModal.show" class="modal-overlay" @click.self="rejectModal.show = false">
        <div class="modal">
          <h2 class="modal-title">Tolak Pengajuan Hapus</h2>
          <div class="form-group">
            <label class="form-label">Catatan (opsional)</label>
            <textarea v-model="rejectModal.catatan" rows="3" placeholder="Alasan penolakan..."></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="rejectModal.show = false">Batal</button>
            <button class="btn btn-accent" @click="submitReject">Tolak</button>
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
