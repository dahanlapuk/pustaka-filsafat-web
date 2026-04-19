<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { getBook, deleteBook } from '../api'
import { useAdmin } from '../stores/admin'

const route = useRoute()
const router = useRouter()
const { adminId, adminNama, isSuperadmin } = useAdmin()
const book = ref(null)
const loading = ref(true)
const error = ref(null)
const deleting = ref(false)

const fetchBook = async () => {
  loading.value = true
  error.value = null
  
  try {
    const response = await getBook(route.params.id)
    book.value = response.data
  } catch (err) {
    error.value = 'Buku tidak ditemukan'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleDelete = async () => {
  const alasan = prompt(`Alasan menghapus buku "${book.value.judul}":\n\n(Wajib diisi)`)
  
  if (!alasan || !alasan.trim()) {
    alert('Alasan penghapusan wajib diisi')
    return
  }
  
  const confirmMsg = isSuperadmin.value
    ? `Hapus buku "${book.value.judul}"?\n\nAlasan: ${alasan}\n\nTindakan ini tidak dapat dibatalkan.`
    : `Request hapus buku "${book.value.judul}"?\n\nAlasan: ${alasan}`
  
  if (!confirm(confirmMsg)) {
    return
  }
  
  deleting.value = true
  try {
    await deleteBook(route.params.id, adminId.value, adminNama.value, isSuperadmin.value, alasan.trim())
    if (isSuperadmin.value) {
      router.push('/admin/catalog')
    } else {
      alert('Permintaan hapus telah dicatat di log. Menunggu persetujuan superadmin.')
    }
  } catch (err) {
    alert('Gagal menghapus buku: ' + (err.response?.data?.error || err.message))
    console.error(err)
  } finally {
    deleting.value = false
  }
}

onMounted(fetchBook)
</script>

<template>
  <div class="container mt-6">
    <!-- Back Link -->
    <RouterLink to="/admin/catalog" class="back-link mb-5">
      ← Kembali ke Katalog
    </RouterLink>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <p>Memuat data...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error">
      <h2>{{ error }}</h2>
      <RouterLink to="/admin/catalog" class="btn btn-secondary mt-4">
        Kembali ke Katalog
      </RouterLink>
    </div>

    <!-- Book Detail -->
    <div v-else-if="book" class="book-detail">
      <div class="book-header">
        <div class="book-badges">
          <span v-if="book.posisi_rak" class="badge badge-default">
            {{ book.posisi_rak }}
          </span>
          <span v-if="book.posisi_kode" class="badge badge-default">
            {{ book.posisi_kode }}
          </span>
          <span v-if="book.is_dipinjam" class="badge badge-accent">
            Dipinjam
          </span>
          <span v-else class="badge badge-success">
            Tersedia
          </span>
        </div>
        
        <h1 class="book-title mt-3">{{ book.judul }}</h1>
        
        <p v-if="book.kategori_nama" class="book-category mt-2">
          {{ book.kategori_nama }}
        </p>
      </div>

      <div class="book-info mt-6">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Kode</span>
            <span class="info-value">{{ book.kode || '-' }}</span>
          </div>
          
          <div class="info-item">
            <span class="info-label">Kategori</span>
            <span class="info-value">{{ book.kategori_nama || '-' }}</span>
          </div>
          
          <div class="info-item">
            <span class="info-label">Posisi</span>
            <span class="info-value">
              {{ book.posisi_rak || '-' }} — {{ book.posisi_kode || '-' }}
            </span>
          </div>
          
          <div class="info-item">
            <span class="info-label">Jumlah</span>
            <span class="info-value">{{ book.qty }} eksemplar</span>
          </div>
          
          <div v-if="book.is_dipinjam" class="info-item">
            <span class="info-label">Dipinjam oleh</span>
            <span class="info-value text-accent">{{ book.peminjam }}</span>
          </div>
        </div>

        <div v-if="book.keterangan" class="book-note mt-6">
          <span class="info-label">Keterangan</span>
          <p class="info-value mt-2">{{ book.keterangan }}</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="book-actions mt-6">
        <RouterLink :to="`/admin/books/${book.id}/edit`" class="btn btn-secondary">
          Edit Buku
        </RouterLink>
        <button 
          class="btn btn-danger" 
          @click="handleDelete"
          :disabled="deleting"
        >
          {{ deleting ? 'Menghapus...' : 'Hapus Buku' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.back-link {
  display: inline-block;
  font-family: var(--font-heading);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gray-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.back-link:hover {
  color: var(--text-primary);
}

.book-detail {
  max-width: 800px;
}

.book-badges {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.book-title {
  font-size: 2.5rem;
  line-height: 1.1;
}

.book-category {
  font-size: 1.125rem;
  color: var(--gray-500);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-5);
}

@media (max-width: 640px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
}

.info-item {
  padding: var(--space-4);
  background-color: var(--gray-100);
  border-left: 3px solid var(--black);
}

.info-label {
  display: block;
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--gray-500);
  margin-bottom: var(--space-1);
}

.info-value {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
}

.book-note {
  padding: var(--space-5);
  background-color: var(--gray-100);
  border-left: 3px solid var(--gray-400);
}

.book-actions {
  display: flex;
  gap: var(--space-3);
  padding-top: var(--space-5);
  border-top: 2px solid var(--gray-200);
}

.btn-danger {
  background-color: var(--white);
  color: var(--accent);
  border: 2px solid var(--accent);
}

.btn-danger:hover {
  background-color: var(--accent);
  color: var(--white);
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading,
.error {
  text-align: center;
  padding: var(--space-10);
}

.error {
  color: var(--accent);
}
</style>
