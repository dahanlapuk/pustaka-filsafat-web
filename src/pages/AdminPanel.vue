<script setup>
import { ref, onMounted } from 'vue'
import { getAdmins, createAdmin, updateAdminBySuper, deleteAdmin } from '../api'
import { useAdmin } from '../stores/admin'

const { currentAdmin } = useAdmin()
const admins     = ref([])
const loading    = ref(true)
const toast      = ref(null)

const modal     = ref({ show: false, mode: 'create', data: null })
const form      = ref({ nama: '', nickname: '', email: '', title: '', password: '', is_superadmin: false })
const formError = ref('')
const saving    = ref(false)

const load = async () => {
  loading.value = true
  try {
    const res = await getAdmins()
    admins.value = res.data || []
  } finally {
    loading.value = false
  }
}

onMounted(load)

const openCreate = () => {
  form.value = { nama: '', nickname: '', email: '', title: '', password: '', is_superadmin: false }
  formError.value = ''
  modal.value = { show: true, mode: 'create', data: null }
}

const openEdit = (a) => {
  form.value = {
    nama: a.nama, nickname: a.nickname || '',
    email: a.email || '', title: a.title || '',
    password: '', is_superadmin: a.is_superadmin
  }
  formError.value = ''
  modal.value = { show: true, mode: 'edit', data: a }
}

const closeModal = () => { modal.value.show = false }

const save = async () => {
  formError.value = ''
  if (!form.value.nama.trim()) { formError.value = 'Nama wajib diisi'; return }
  if (modal.value.mode === 'create' && !form.value.password) {
    formError.value = 'Password wajib diisi untuk admin baru'; return
  }

  saving.value = true
  try {
    if (modal.value.mode === 'create') {
      await createAdmin({
        ...form.value,
        created_by_id: currentAdmin.value?.id,
        created_by_nama: currentAdmin.value?.nama,
      })
      showToast('Admin baru berhasil dibuat')
    } else {
      await updateAdminBySuper(modal.value.data.id, {
        nama: form.value.nama, nickname: form.value.nickname,
        email: form.value.email, title: form.value.title,
        is_superadmin: form.value.is_superadmin,
        updated_by_id: currentAdmin.value?.id,
        updated_by_nama: currentAdmin.value?.nama,
      })
      showToast('Data admin diperbarui')
    }
    closeModal()
    load()
  } catch (e) {
    formError.value = e.response?.data?.error || 'Gagal menyimpan'
  } finally {
    saving.value = false
  }
}

const remove = async (a) => {
  if (a.id === currentAdmin.value?.id) { showToast('Tidak bisa menghapus akun sendiri', 'error'); return }
  if (a.is_superadmin) { showToast('Tidak bisa menghapus superadmin', 'error'); return }
  if (!confirm(`Hapus admin "${a.nama}"? Aksi ini tidak bisa dibatalkan.`)) return
  try {
    await deleteAdmin(a.id, { admin_id: currentAdmin.value?.id, admin_nama: currentAdmin.value?.nama })
    showToast('Admin berhasil dihapus')
    load()
  } catch (e) {
    showToast(e.response?.data?.error || 'Gagal menghapus', 'error')
  }
}

const showToast = (msg, type = 'success') => {
  toast.value = { msg, type }
  setTimeout(() => { toast.value = null }, 3000)
}

const formatDate = (d) => d ? new Date(d).toLocaleDateString('id-ID') : '-'
</script>

<template>
  <div class="page-wrap" style="padding: 1.5rem;">
    <Transition name="toast-fade">
      <div v-if="toast" :class="`toast toast-${toast.type}`">{{ toast.msg }}</div>
    </Transition>

    <div class="page-header">
      <div>
        <h1 class="page-title">Panel Superadmin</h1>
        <p class="page-subtitle">Kelola akun admin perpustakaan</p>
      </div>
      <button class="btn btn-primary" @click="openCreate">+ Admin Baru</button>
    </div>

    <div v-if="loading" class="loading-state">Memuat data admin...</div>

    <template v-else>
      <!-- Desktop Table -->
      <div class="table-wrap table-mobile-hide">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Nickname</th>
              <th>Email</th>
              <th>Title / Jabatan</th>
              <th>Role</th>
              <th class="col-date">Dibuat</th>
              <th style="width: 140px;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in admins" :key="a.id" :class="{ 'row-self': a.id === currentAdmin?.id }">
              <td>
                <strong>{{ a.nama }}</strong>
                <span v-if="a.id === currentAdmin?.id" class="badge badge-default" style="margin-left: 0.5rem; font-size: 0.65rem;">Anda</span>
              </td>
              <td style="color: var(--text-secondary);">{{ a.nickname || '—' }}</td>
              <td style="color: var(--text-secondary); font-size: 0.85rem;">{{ a.email || '—' }}</td>
              <td>{{ a.title || '—' }}</td>
              <td>
                <span :class="a.is_superadmin ? 'badge badge-super' : 'badge badge-default'">
                  {{ a.is_superadmin ? 'Superadmin' : 'Admin' }}
                </span>
              </td>
              <td class="col-date">{{ formatDate(a.created_at) }}</td>
              <td class="col-actions">
                <div style="display: flex; gap: 0.5rem;">
                  <button class="btn btn-secondary btn-sm" @click="openEdit(a)">Edit</button>
                  <button
                    class="btn btn-danger btn-sm"
                    :disabled="a.id === currentAdmin?.id || a.is_superadmin"
                    @click="remove(a)"
                  >Hapus</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="card-mobile-show">
        <div v-for="a in admins" :key="a.id" class="mobile-card">
          <div class="mobile-card-title">
            {{ a.nama }}
            <span v-if="a.id === currentAdmin?.id" class="badge badge-default" style="font-size: 0.65rem; margin-left: 0.5rem;">Anda</span>
          </div>
          <div class="mobile-card-meta">
            <span :class="a.is_superadmin ? 'badge badge-super' : 'badge badge-default'">
              {{ a.is_superadmin ? 'Superadmin' : 'Admin' }}
            </span>
            {{ a.title || '' }}
          </div>
          <div class="mobile-card-actions">
            <button class="btn btn-secondary btn-sm" @click="openEdit(a)">Edit</button>
            <button
              class="btn btn-danger btn-sm"
              :disabled="a.id === currentAdmin?.id || a.is_superadmin"
              @click="remove(a)"
            >Hapus</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Modal Create / Edit -->
    <Transition name="modal-fade">
      <div v-if="modal.show" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <h2 class="modal-title">{{ modal.mode === 'create' ? 'Tambah Admin Baru' : 'Edit Admin' }}</h2>

          <div v-if="formError" class="error-banner">{{ formError }}</div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nama Lengkap *</label>
              <input v-model="form.nama" type="text" placeholder="Nama lengkap" />
            </div>
            <div class="form-group">
              <label class="form-label">Nickname</label>
              <input v-model="form.nickname" type="text" placeholder="Nama panggilan" />
            </div>
            <div class="form-group">
              <label class="form-label">Title / Jabatan</label>
              <input v-model="form.title" type="text" placeholder="Magang, Kaprodi, dll" />
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input v-model="form.email" type="email" placeholder="email@ui.ac.id" />
            </div>
            <div v-if="modal.mode === 'create'" class="form-group" style="grid-column: span 2;">
              <label class="form-label">Password *</label>
              <input v-model="form.password" type="password" placeholder="Minimal 6 karakter" />
            </div>
          </div>

          <div class="form-group" style="margin-top: 0.5rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" v-model="form.is_superadmin" />
              <span style="font-weight: 600; font-size: 0.9rem;">Berikan akses Superadmin</span>
            </label>
            <p class="form-hint">Superadmin bisa menyetujui penghapusan buku dan mengelola admin lain.</p>
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" @click="closeModal">Batal</button>
            <button class="btn btn-primary" :disabled="saving" @click="save">
              {{ saving ? 'Menyimpan...' : (modal.mode === 'create' ? 'Buat Admin' : 'Simpan') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.row-self td { background: var(--bg-elevated); }

.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.3s; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(1rem); }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
