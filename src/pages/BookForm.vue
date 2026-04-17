<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBook, createBook, updateBook, getCategories } from '../api'
import { useAdmin } from '../stores/admin'
import PosisiSelector from '../components/PosisiSelector.vue'

const route  = useRoute()
const router = useRouter()
const { currentAdmin } = useAdmin()

const isEdit    = computed(() => !!route.params.id)
const pageTitle = computed(() => isEdit.value ? 'Edit Buku' : 'Tambah Buku')

const loading = ref(false)
const saving  = ref(false)
const error   = ref(null)
const success = ref(null)

const categories = ref([])

const form = ref({
  kode:        '',
  judul:       '',
  kategori_id: null,
  posisi_id:   null,
  qty:         1,
  keterangan:  ''
})

// ── Load data ─────────────────────────────────────────────
const fetchBook = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const res  = await getBook(route.params.id)
    const book = res.data
    form.value = {
      kode:        book.kode        || '',
      judul:       book.judul       || '',
      kategori_id: book.kategori_id || null,
      posisi_id:   book.posisi_id   || null,
      qty:         book.qty         || 1,
      keterangan:  book.keterangan  || ''
    }
  } catch {
    error.value = 'Gagal memuat data buku'
  } finally {
    loading.value = false
  }
}

const fetchCategories = async () => {
  try {
    const res = await getCategories()
    categories.value = res.data || []
  } catch { /* ignore */ }
}

onMounted(() => {
  fetchCategories()
  fetchBook()
})

// ── Submit ────────────────────────────────────────────────
const handleSubmit = async () => {
  error.value   = null
  success.value = null

  if (!form.value.judul.trim()) {
    error.value = 'Judul buku wajib diisi'
    return
  }

  saving.value = true
  try {
    const payload = {
      kode:        form.value.kode.trim() || null,
      judul:       form.value.judul.trim(),
      kategori_id: form.value.kategori_id || null,
      posisi_id:   form.value.posisi_id   || null,
      qty:         parseInt(form.value.qty) || 1,
      keterangan:  form.value.keterangan.trim() || null,
      admin_id:    currentAdmin.value?.id,
      admin_nama:  currentAdmin.value?.nama,
    }

    if (isEdit.value) {
      await updateBook(route.params.id, payload)
      success.value = 'Buku berhasil diupdate'
    } else {
      await createBook(payload)
      success.value = 'Buku berhasil ditambahkan'
      form.value = { kode: '', judul: '', kategori_id: null, posisi_id: null, qty: 1, keterangan: '' }
    }
    setTimeout(() => router.push('/admin/books'), 1500)
  } catch (e) {
    error.value = e.response?.data?.error || 'Gagal menyimpan buku'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page-wrap" style="padding: 1.5rem;">
    <div style="max-width: 640px;">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ pageTitle }}</h1>
          <p class="page-subtitle">{{ isEdit ? 'Ubah informasi dan posisi buku' : 'Tambah buku baru ke katalog' }}</p>
        </div>
        <button class="btn btn-ghost" @click="router.back()">← Kembali</button>
      </div>

      <div v-if="loading" class="loading-state">Memuat data buku...</div>

      <form v-else @submit.prevent="handleSubmit">
        <!-- Alert error / success -->
        <div v-if="error"   class="error-banner"   style="margin-bottom: 1.25rem;">{{ error }}</div>
        <div v-if="success" class="success-banner" style="margin-bottom: 1.25rem;">✓ {{ success }}</div>

        <!-- Judul -->
        <div class="form-group">
          <label class="form-label">Judul Buku <span style="color: var(--danger);">*</span></label>
          <input v-model="form.judul" type="text" placeholder="Masukkan judul buku" required />
        </div>

        <!-- Kode + Qty row -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Kode Buku</label>
            <input v-model="form.kode" type="text" placeholder="190.9 KAN k" />
            <span class="form-hint">Kode klasifikasi (opsional)</span>
          </div>
          <div class="form-group">
            <label class="form-label">Jumlah Eksemplar</label>
            <input v-model="form.qty" type="number" min="1" max="999" style="max-width: 100px;" />
          </div>
        </div>

        <!-- Kategori -->
        <div class="form-group">
          <label class="form-label">Kategori</label>
          <select v-model="form.kategori_id">
            <option :value="null">— Pilih Kategori —</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.nama }}</option>
          </select>
        </div>

        <!-- Posisi — PosisiSelector cascading -->
        <div class="form-group">
          <label class="form-label">Posisi Rak</label>
          <PosisiSelector v-model="form.posisi_id" />
          <span class="form-hint">Pilih posisi menggunakan dropdown bertingkat (opsional, bisa diisi nanti)</span>
        </div>

        <!-- Keterangan -->
        <div class="form-group">
          <label class="form-label">Keterangan</label>
          <textarea v-model="form.keterangan" rows="3" placeholder="Catatan tambahan (opsional)"></textarea>
        </div>

        <!-- Actions -->
        <div class="modal-actions" style="border-top: 1px solid var(--border); padding-top: 1.25rem; margin-top: 0.5rem;">
          <button type="button" class="btn btn-secondary" @click="router.back()">Batal</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Menyimpan...' : (isEdit ? 'Update Buku' : 'Tambah Buku') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.form-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  align-items: start;
}

@media (max-width: 480px) {
  .form-row { grid-template-columns: 1fr; }
}
</style>
