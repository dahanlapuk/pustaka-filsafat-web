<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBook, createBook, updateBook, getCategories, getPosisi } from '../api'
import { useAdmin } from '../stores/admin'

const route = useRoute()
const router = useRouter()
const { adminId, adminNama, isLoggedIn } = useAdmin()

const isEdit = computed(() => !!route.params.id)
const pageTitle = computed(() => isEdit.value ? 'Edit Buku' : 'Tambah Buku')

const loading = ref(false)
const saving = ref(false)
const error = ref(null)
const success = ref(null)

const categories = ref([])
const posisiList = ref([])

const form = ref({
  kode: '',
  judul: '',
  kategori_id: null,
  posisi_id: null,
  qty: 1,
  keterangan: ''
})

const fetchBook = async () => {
  if (!isEdit.value) return
  
  loading.value = true
  try {
    const response = await getBook(route.params.id)
    const book = response.data
    form.value = {
      kode: book.kode || '',
      judul: book.judul || '',
      kategori_id: book.kategori_id,
      posisi_id: book.posisi_id,
      qty: book.qty || 1,
      keterangan: book.keterangan || ''
    }
  } catch (err) {
    error.value = 'Gagal memuat data buku'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const fetchOptions = async () => {
  try {
    const [catRes, posRes] = await Promise.all([
      getCategories(),
      getPosisi()
    ])
    categories.value = catRes.data || []
    posisiList.value = posRes.data || []
  } catch (err) {
    console.error('Failed to load options:', err)
  }
}

const handleSubmit = async () => {
  error.value = null
  success.value = null
  
  // Validation
  if (!form.value.judul.trim()) {
    error.value = 'Judul buku wajib diisi'
    return
  }
  
  saving.value = true
  
  try {
    const payload = {
      ...form.value,
      kode: form.value.kode.trim() || null,
      judul: form.value.judul.trim(),
      kategori_id: form.value.kategori_id || null,
      posisi_id: form.value.posisi_id || null,
      qty: parseInt(form.value.qty) || 1,
      keterangan: form.value.keterangan.trim() || null,
      admin_id: adminId.value,
      admin_nama: adminNama.value
    }
    
    if (isEdit.value) {
      await updateBook(route.params.id, payload)
      success.value = 'Buku berhasil diupdate'
    } else {
      await createBook(payload)
      success.value = 'Buku berhasil ditambahkan'
      // Reset form after create
      form.value = {
        kode: '',
        judul: '',
        kategori_id: null,
        posisi_id: null,
        qty: 1,
        keterangan: ''
      }
    }
    
    // Redirect after short delay
    setTimeout(() => {
      router.push('/admin/books')
    }, 1500)
    
  } catch (err) {
    error.value = err.response?.data?.error || 'Gagal menyimpan buku'
    console.error(err)
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  router.back()
}

onMounted(() => {
  fetchOptions()
  fetchBook()
})
</script>

<template>
  <div class="container mt-6">
    <div class="form-page">
      <h1 class="page-title">{{ pageTitle }}</h1>
      
      <!-- Loading -->
      <div v-if="loading" class="loading">
        <p>Memuat data...</p>
      </div>
      
      <!-- Form -->
      <form v-else @submit.prevent="handleSubmit" class="book-form">
        <!-- Error Alert -->
        <div v-if="error" class="alert alert-error mb-4">
          {{ error }}
        </div>
        
        <!-- Success Alert -->
        <div v-if="success" class="alert alert-success mb-4">
          {{ success }}
        </div>
        
        <!-- Judul -->
        <div class="form-group">
          <label class="form-label">
            Judul Buku <span class="required">*</span>
          </label>
          <input
            v-model="form.judul"
            type="text"
            class="form-input"
            placeholder="Masukkan judul buku"
            required
          />
        </div>
        
        <!-- Kode -->
        <div class="form-group">
          <label class="form-label">Kode Buku</label>
          <input
            v-model="form.kode"
            type="text"
            class="form-input"
            placeholder="Opsional — kosongkan jika belum ada"
          />
          <span class="form-hint">Kode klasifikasi perpustakaan (misal: 190.9 KAN k)</span>
        </div>
        
        <!-- Kategori & Posisi Row -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Kategori</label>
            <select v-model="form.kategori_id" class="form-input">
              <option :value="null">— Pilih Kategori —</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.nama }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">Posisi Rak</label>
            <select v-model="form.posisi_id" class="form-input">
              <option :value="null">— Pilih Posisi —</option>
              <option v-for="pos in posisiList" :key="pos.id" :value="pos.id">
                {{ pos.rak }} — {{ pos.kode }}
              </option>
            </select>
            <span class="form-hint">Opsional — bisa ditentukan nanti via Absen Buku</span>
          </div>
        </div>
        
        <!-- Qty -->
        <div class="form-group form-group-small">
          <label class="form-label">Jumlah Eksemplar</label>
          <input
            v-model="form.qty"
            type="number"
            class="form-input"
            min="1"
            max="999"
          />
        </div>
        
        <!-- Keterangan -->
        <div class="form-group">
          <label class="form-label">Keterangan</label>
          <textarea
            v-model="form.keterangan"
            class="form-input form-textarea"
            placeholder="Catatan tambahan (opsional)"
            rows="3"
          ></textarea>
        </div>
        
        <!-- Actions -->
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="handleCancel">
            Batal
          </button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Menyimpan...' : (isEdit ? 'Update Buku' : 'Tambah Buku') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.form-page {
  max-width: 600px;
}

.page-title {
  margin-bottom: var(--space-6);
}

.book-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-group-small {
  max-width: 150px;
}

.form-label {
  font-family: var(--font-heading);
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--gray-700);
}

.required {
  color: var(--accent);
}

.form-input {
  padding: var(--space-3) var(--space-4);
  font-size: 1rem;
  border: 2px solid var(--gray-300);
  border-radius: var(--radius-sm);
  background-color: var(--white);
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--black);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-hint {
  font-size: 0.75rem;
  color: var(--gray-500);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

.form-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  margin-top: var(--space-4);
  padding-top: var(--space-5);
  border-top: 2px solid var(--gray-200);
}

.alert {
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  font-weight: 500;
}

.alert-error {
  background-color: #FEE2E2;
  color: #991B1B;
  border: 1px solid #FECACA;
}

.alert-success {
  background-color: #D1FAE5;
  color: #065F46;
  border: 1px solid #A7F3D0;
}

.loading {
  text-align: center;
  padding: var(--space-10);
  color: var(--gray-500);
}
</style>
