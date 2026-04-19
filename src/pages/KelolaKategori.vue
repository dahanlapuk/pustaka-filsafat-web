<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAdmin } from '../stores/admin'
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getCategoryRequests, createCategoryRequest, approveCategoryRequest, rejectCategoryRequest
} from '../api'

const { currentAdmin, isSuperadmin } = useAdmin()

// ── Data ──────────────────────────────────────────────────
const categories    = ref([])
const requests      = ref([])
const loading       = ref(false)
const loadingReq    = ref(false)

const activeTab     = ref('semua')
const reqStatusTab  = ref('pending')

const searchQuery   = ref('')
const filterTab     = ref('all')

// ── Modals ────────────────────────────────────────────────
const showAddModal      = ref(false)
const showEditModal     = ref(false)
const showProposeModal  = ref(false)
const showDeleteConfirm = ref(false)

const newNama       = ref('')
const newGrouping   = ref('')
const editNama      = ref('')
const editGrouping  = ref('')
const editTarget    = ref(null)
const deleteTarget  = ref(null)
const proposeNama   = ref('')
const proposeAlasan = ref('')

const toast         = ref(null)
const submitting    = ref(false)

const GROUPING_OPTIONS = [
  { value: '', label: 'Tanpa Group' },
  { value: 'bentuk', label: 'Bentuk' },
  { value: 'konten', label: 'Konten' },
  { value: 'lain', label: 'Lain' },
]

const groupingLabel = (value) => {
  const item = GROUPING_OPTIONS.find(opt => opt.value === (value || ''))
  return item ? item.label : 'Tanpa Group'
}

// ── Fetch ─────────────────────────────────────────────────
async function fetchCategories() {
  loading.value = true
  try {
    const res = await getCategories()
    categories.value = res.data || []
  } finally {
    loading.value = false
  }
}

async function fetchRequests() {
  if (!isSuperadmin.value) return
  loadingReq.value = true
  try {
    const res = await getCategoryRequests(reqStatusTab.value)
    requests.value = res.data || []
  } finally {
    loadingReq.value = false
  }
}

onMounted(() => {
  fetchCategories()
  if (isSuperadmin.value) fetchRequests()
})

// ── Computed: filter ──────────────────────────────────────
const filteredCategories = computed(() => {
  let list = categories.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(c => c.nama.toLowerCase().includes(q))
  }
  if (filterTab.value === 'used')  list = list.filter(c => (c.book_count || 0) > 0)
  if (filterTab.value === 'empty') list = list.filter(c => (c.book_count || 0) === 0)
  return list
})

// ── Format tanggal ────────────────────────────────────────
function formatDate(str) {
  if (!str) return '-'
  return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Toast ─────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  toast.value = { msg, type }
  setTimeout(() => { toast.value = null }, 3000)
}

// ── Superadmin: Tambah kategori ───────────────────────────
async function submitAdd() {
  if (!newNama.value.trim()) return
  submitting.value = true
  try {
    await createCategory({
      nama: newNama.value.trim(),
      grouping: newGrouping.value || null,
      admin_id: currentAdmin.value.id,
      admin_nama: currentAdmin.value.nama
    })
    showToast('Kategori berhasil dibuat')
    newNama.value = ''
    newGrouping.value = ''
    showAddModal.value = false
    fetchCategories()
  } catch (e) {
    showToast(e.response?.data?.error || 'Gagal membuat kategori', 'error')
  } finally {
    submitting.value = false
  }
}

// ── Edit kategori (admin & superadmin) ───────────────────
function openEdit(cat) {
  editTarget.value = cat
  editNama.value = cat.nama
  editGrouping.value = cat.grouping || ''
  showEditModal.value = true
}

async function submitEdit() {
  if (!editNama.value.trim()) return
  submitting.value = true
  try {
    await updateCategory(editTarget.value.id, {
      nama: editNama.value.trim(),
      grouping: editGrouping.value || null,
      admin_id: currentAdmin.value.id,
      admin_nama: currentAdmin.value.nama
    })
    showToast('Kategori diperbarui')
    showEditModal.value = false
    fetchCategories()
  } catch (e) {
    showToast(e.response?.data?.error || 'Gagal update kategori', 'error')
  } finally {
    submitting.value = false
  }
}

// ── Superadmin: Hapus kategori ───────────────────────────
function openDelete(cat) {
  deleteTarget.value = cat
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  submitting.value = true
  try {
    await deleteCategory(deleteTarget.value.id, {
      admin_id: currentAdmin.value.id,
      admin_nama: currentAdmin.value.nama
    })
    showToast('Kategori dihapus')
    showDeleteConfirm.value = false
    fetchCategories()
  } catch (e) {
    showToast(e.response?.data?.error || 'Gagal menghapus', 'error')
  } finally {
    submitting.value = false
  }
}

// ── Admin biasa: Ajukan kategori ──────────────────────────
async function submitPropose() {
  if (!proposeNama.value.trim()) return
  submitting.value = true
  try {
    await createCategoryRequest({
      nama_requested: proposeNama.value.trim(),
      alasan: proposeAlasan.value,
      requested_by: currentAdmin.value.id,
      requested_by_nama: currentAdmin.value.nama
    })
    showToast('Pengajuan terkirim, menunggu persetujuan superadmin')
    proposeNama.value = ''
    proposeAlasan.value = ''
    showProposeModal.value = false
  } catch (e) {
    showToast(e.response?.data?.error || 'Gagal mengajukan', 'error')
  } finally {
    submitting.value = false
  }
}

// ── Superadmin: Approve/Reject request ───────────────────
async function approveReq(req) {
  try {
    await approveCategoryRequest(req.id, {
      admin_id: currentAdmin.value.id,
      admin_nama: currentAdmin.value.nama
    })
    showToast(`Kategori "${req.nama_requested}" disetujui`)
    fetchRequests()
    fetchCategories()
  } catch (e) {
    showToast(e.response?.data?.error || 'Gagal approve', 'error')
  }
}

async function rejectReq(req) {
  const catatan = prompt('Catatan penolakan (opsional):') ?? ''
  try {
    await rejectCategoryRequest(req.id, {
      admin_id: currentAdmin.value.id,
      admin_nama: currentAdmin.value.nama,
      catatan_review: catatan
    })
    showToast('Pengajuan ditolak')
    fetchRequests()
  } catch (e) {
    showToast(e.response?.data?.error || 'Gagal reject', 'error')
  }
}

function onReqTabChange() {
  fetchRequests()
}
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
        <h1 class="page-title">Kelola Kategori</h1>
        <p class="page-subtitle">{{ categories.length }} kategori terdaftar</p>
      </div>
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <button v-if="isSuperadmin" class="btn btn-primary" @click="showAddModal = true">
          + Tambah Kategori
        </button>
        <button v-else class="btn btn-secondary" @click="showProposeModal = true">
          ✉ Ajukan Kategori Baru
        </button>
      </div>
    </div>

    <!-- Main Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'semua' }" @click="activeTab = 'semua'">
        Semua Kategori
      </button>
      <button v-if="isSuperadmin" class="tab" :class="{ active: activeTab === 'pengajuan' }" @click="activeTab = 'pengajuan'">
        Pengajuan
        <span v-if="requests.filter(r => r.status === 'pending').length > 0" class="badge-count" style="margin-left: 0.375rem;">
          {{ requests.filter(r => r.status === 'pending').length }}
        </span>
      </button>
    </div>

    <!-- TAB: Semua Kategori -->
    <template v-if="activeTab === 'semua'">
      <!-- Filter bar -->
      <div style="display: flex; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap; align-items: center;">
        <div class="tabs" style="margin-bottom: 0; border-bottom: none; gap: 0;">
          <button class="tab btn-sm" :class="{ active: filterTab === 'all' }"   @click="filterTab = 'all'">Semua</button>
          <button class="tab btn-sm" :class="{ active: filterTab === 'used' }"  @click="filterTab = 'used'">Terpakai</button>
          <button class="tab btn-sm" :class="{ active: filterTab === 'empty' }" @click="filterTab = 'empty'">Kosong</button>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari kategori..."
          style="width: 240px; padding: 0.5rem 0.75rem; font-size: 0.875rem;"
        />
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">Memuat kategori...</div>

      <!-- Desktop: Table -->
      <div v-else-if="filteredCategories.length > 0" class="table-wrap table-mobile-hide">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 48px;">#</th>
              <th>Nama Kategori</th>
              <th style="width: 120px;">Grouping</th>
              <th style="width: 100px; text-align: center;">Buku</th>
              <th style="width: 160px;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(cat, i) in filteredCategories" :key="cat.id">
              <td class="col-id">{{ i + 1 }}</td>
              <td style="font-weight: 500;">{{ cat.nama }}</td>
              <td>
                <span class="badge badge-default">{{ groupingLabel(cat.grouping) }}</span>
              </td>
              <td style="text-align: center;">
                <span class="badge" :class="cat.book_count > 0 ? 'badge-default' : 'badge-pending'">
                  {{ cat.book_count || 0 }}
                </span>
              </td>
              <td class="col-actions">
                <div style="display: flex; gap: 0.5rem;">
                  <button class="btn btn-secondary btn-sm" @click="openEdit(cat)">Edit</button>
                  <button
                    v-if="isSuperadmin"
                    class="btn btn-danger btn-sm"
                    @click="openDelete(cat)"
                    :disabled="(cat.book_count || 0) > 0"
                    :title="(cat.book_count || 0) > 0 ? 'Tidak bisa hapus: masih ada buku' : 'Hapus kategori'"
                  >Hapus</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile: Cards -->
      <div class="card-mobile-show" v-if="!loading">
        <div v-for="cat in filteredCategories" :key="cat.id" class="mobile-card">
          <div class="mobile-card-title">{{ cat.nama }}</div>
          <div class="mobile-card-meta">
            <span class="badge badge-default">{{ groupingLabel(cat.grouping) }}</span>
            <span class="badge" :class="cat.book_count > 0 ? 'badge-default' : 'badge-pending'">
              {{ cat.book_count || 0 }} buku
            </span>
          </div>
          <div class="mobile-card-actions">
            <button class="btn btn-secondary btn-sm" @click="openEdit(cat)">Edit</button>
            <button
              v-if="isSuperadmin"
              class="btn btn-danger btn-sm"
              @click="openDelete(cat)"
              :disabled="(cat.book_count || 0) > 0"
            >Hapus</button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!loading && filteredCategories.length === 0" class="empty-state">
        <div class="empty-icon">🗂</div>
        <div class="empty-text">Tidak ada kategori ditemukan</div>
      </div>
    </template>

    <!-- TAB: Pengajuan (superadmin only) -->
    <template v-if="activeTab === 'pengajuan' && isSuperadmin">
      <!-- Status filter -->
      <div class="tabs" style="margin-bottom: 1.25rem;">
        <button class="tab" :class="{ active: reqStatusTab === 'pending' }"  @click="reqStatusTab = 'pending';  onReqTabChange()">Menunggu</button>
        <button class="tab" :class="{ active: reqStatusTab === 'approved' }" @click="reqStatusTab = 'approved'; onReqTabChange()">Disetujui</button>
        <button class="tab" :class="{ active: reqStatusTab === 'rejected' }" @click="reqStatusTab = 'rejected'; onReqTabChange()">Ditolak</button>
      </div>

      <div v-if="loadingReq" class="loading-state">Memuat pengajuan...</div>

      <div v-else-if="requests.length > 0" class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>Nama Usulan</th>
              <th>Alasan</th>
              <th>Diajukan Oleh</th>
              <th class="col-date">Tanggal</th>
              <th v-if="reqStatusTab === 'pending'">Aksi</th>
              <th v-else>Review</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(req, i) in requests" :key="req.id">
              <td class="col-id">{{ i + 1 }}</td>
              <td style="font-weight: 600;">{{ req.nama_requested }}</td>
              <td style="color: var(--text-secondary); font-size: 0.85rem;">{{ req.alasan || '-' }}</td>
              <td>{{ req.requested_by_nama }}</td>
              <td class="col-date">{{ formatDate(req.created_at) }}</td>
              <td v-if="reqStatusTab === 'pending'" class="col-actions">
                <div style="display: flex; gap: 0.5rem;">
                  <button class="btn btn-approve" @click="approveReq(req)">✓ Setujui</button>
                  <button class="btn btn-reject"  @click="rejectReq(req)">✗ Tolak</button>
                </div>
              </td>
              <td v-else>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">
                  <span :class="req.status === 'approved' ? 'badge-approved' : 'badge-rejected'" class="badge">
                    {{ req.status === 'approved' ? 'Disetujui' : 'Ditolak' }}
                  </span>
                  <div v-if="req.catatan_review" style="margin-top: 0.25rem; font-style: italic;">
                    "{{ req.catatan_review }}"
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="!loadingReq" class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">
          {{ reqStatusTab === 'pending' ? 'Tidak ada pengajuan yang menunggu' : 'Belum ada riwayat' }}
        </div>
      </div>
    </template>

    <!-- ── MODAL: Tambah Kategori (Superadmin) ─────────── -->
    <Transition name="modal-fade">
      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
        <div class="modal">
          <h2 class="modal-title">Tambah Kategori Baru</h2>
          <div class="form-group">
            <label class="form-label">Nama Kategori *</label>
            <input v-model="newNama" type="text" placeholder="Contoh: Buku Sosial" @keyup.enter="submitAdd" />
          </div>
          <div class="form-group">
            <label class="form-label">Grouping</label>
            <select v-model="newGrouping">
              <option v-for="opt in GROUPING_OPTIONS" :key="`new-${opt.value || 'none'}`" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showAddModal = false" :disabled="submitting">Batal</button>
            <button class="btn btn-primary" @click="submitAdd" :disabled="submitting || !newNama.trim()">
              {{ submitting ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── MODAL: Edit Kategori ───────────────────────── -->
    <Transition name="modal-fade">
      <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
        <div class="modal">
          <h2 class="modal-title">Edit Kategori</h2>
          <div class="form-group">
            <label class="form-label">Nama Kategori *</label>
            <input v-model="editNama" type="text" @keyup.enter="submitEdit" />
          </div>
          <div class="form-group">
            <label class="form-label">Grouping</label>
            <select v-model="editGrouping">
              <option v-for="opt in GROUPING_OPTIONS" :key="`edit-${opt.value || 'none'}`" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showEditModal = false" :disabled="submitting">Batal</button>
            <button class="btn btn-primary" @click="submitEdit" :disabled="submitting || !editNama.trim()">
              {{ submitting ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── MODAL: Konfirmasi Hapus ────────────────────── -->
    <Transition name="modal-fade">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
        <div class="modal">
          <h2 class="modal-title">Hapus Kategori?</h2>
          <p style="color: var(--text-secondary); margin-bottom: 1rem;">
            Kategori <strong>{{ deleteTarget?.nama }}</strong> akan dihapus permanen.
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showDeleteConfirm = false" :disabled="submitting">Batal</button>
            <button class="btn btn-accent" @click="confirmDelete" :disabled="submitting">
              {{ submitting ? 'Menghapus...' : 'Ya, Hapus' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── MODAL: Ajukan Kategori (Admin biasa) ───────── -->
    <Transition name="modal-fade">
      <div v-if="showProposeModal" class="modal-overlay" @click.self="showProposeModal = false">
        <div class="modal">
          <h2 class="modal-title">Ajukan Kategori Baru</h2>
          <p class="form-hint" style="margin-bottom: 1rem;">
            Pengajuan akan dikirim ke superadmin untuk ditinjau.
          </p>
          <div class="form-group">
            <label class="form-label">Nama Kategori yang Diusulkan *</label>
            <input v-model="proposeNama" type="text" placeholder="Contoh: Buku Psikologi" />
          </div>
          <div class="form-group">
            <label class="form-label">Alasan / Keterangan</label>
            <textarea v-model="proposeAlasan" rows="3" placeholder="Mengapa kategori ini perlu ditambahkan?"></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showProposeModal = false" :disabled="submitting">Batal</button>
            <button class="btn btn-primary" @click="submitPropose" :disabled="submitting || !proposeNama.trim()">
              {{ submitting ? 'Mengirim...' : 'Kirim Pengajuan' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Toast */
.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.3s; }
.toast-fade-enter-from, .toast-fade-leave-to       { opacity: 0; transform: translateX(1rem); }

/* Modal */
.modal-fade-enter-active, .modal-fade-leave-active { transition: all 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to       { opacity: 0; }
</style>
