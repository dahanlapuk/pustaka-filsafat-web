<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { getBooks, searchBooks, deleteBook } from '../api'
import { useAdmin } from '../stores/admin'

const router = useRouter()
const { adminId, adminNama, isSuperadmin } = useAdmin()
const books = ref([])
const loading = ref(true)
const searchQuery = ref('')
const deleting = ref(null)

// Filtered books (client-side for instant feedback)
const filteredBooks = computed(() => {
  if (!searchQuery.value.trim()) return books.value
  const q = searchQuery.value.toLowerCase()
  return books.value.filter(b => 
    b.judul?.toLowerCase().includes(q) ||
    b.kode?.toLowerCase().includes(q) ||
    b.kategori_nama?.toLowerCase().includes(q)
  )
})

const fetchBooks = async () => {
  loading.value = true
  try {
    const res = await getBooks()
    books.value = res.data || []
  } catch (err) {
    console.error('Failed to load books:', err)
  } finally {
    loading.value = false
  }
}

const handleDelete = async (book) => {
  const alasan = prompt(`Alasan menghapus buku "${book.judul}":\n\n(Wajib diisi)`)
  
  if (!alasan || !alasan.trim()) {
    alert('Alasan penghapusan wajib diisi')
    return
  }
  
  const confirmMsg = isSuperadmin.value 
    ? `Hapus buku "${book.judul}"?\n\nAlasan: ${alasan}\n\nSebagai Superadmin, buku akan langsung dihapus.`
    : `Request hapus buku "${book.judul}"?\n\nAlasan: ${alasan}\n\nPermintaan akan dicatat di log untuk persetujuan.`
  
  if (!confirm(confirmMsg)) {
    return
  }
  
  deleting.value = book.id
  try {
    await deleteBook(book.id, adminId.value, adminNama.value, isSuperadmin.value, alasan.trim())
    if (isSuperadmin.value) {
      books.value = books.value.filter(b => b.id !== book.id)
      alert('Buku berhasil dihapus')
    } else {
      alert('Permintaan hapus telah dicatat di log. Menunggu persetujuan superadmin.')
    }
  } catch (err) {
    const errMsg = err.response?.data?.message || err.response?.data?.error || err.message
    alert(errMsg)
  } finally {
    deleting.value = null
  }
}

const goToEdit = (id) => {
  router.push(`/admin/books/${id}/edit`)
}

const goToAdd = () => {
  router.push('/admin/books/add')
}

onMounted(fetchBooks)
</script>

<template>
  <div class="admin-catalog">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>Daftar Buku</h1>
        <p class="subtitle">{{ books.length }} buku tercatat</p>
      </div>
      <button class="btn btn-primary" @click="goToAdd">
        + Tambah Buku
      </button>
    </div>

    <!-- Search -->
    <div class="search-bar">
      <input 
        type="text"
        v-model="searchQuery"
        placeholder="Cari judul, kode, atau kategori..."
        class="search-input"
      />
      <span v-if="searchQuery" class="search-count">
        {{ filteredBooks.length }} hasil
      </span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">Memuat data...</div>

    <!-- Book List -->
    <div v-else class="book-list">
      <div 
        v-for="book in filteredBooks" 
        :key="book.id" 
        class="book-item"
      >
        <div class="book-main">
          <div class="book-code">{{ book.kode || '—' }}</div>
          <div class="book-info">
            <h3 class="book-title">{{ book.judul }}</h3>
            <div class="book-meta">
              <span v-if="book.kategori_nama" class="meta-item">
                {{ book.kategori_nama }}
              </span>
              <span v-if="book.posisi_kode" class="meta-item">
                📍 {{ book.posisi_kode }}
              </span>
              <span v-else class="meta-item no-posisi">
                📍 Belum ditentukan
              </span>
            </div>
          </div>
        </div>
        
        <div class="book-status">
          <span v-if="book.is_dipinjam" class="badge borrowed">
            Dipinjam oleh {{ book.peminjam }}
          </span>
          <span v-else class="badge available">Tersedia</span>
        </div>

        <div class="book-actions">
          <button class="btn-action edit" @click="goToEdit(book.id)" title="Edit">
            ✎
          </button>
          <button 
            class="btn-action delete" 
            @click="handleDelete(book)" 
            :disabled="deleting === book.id"
            title="Hapus"
          >
            {{ deleting === book.id ? '...' : '✕' }}
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="filteredBooks.length === 0 && !loading" class="empty-state">
        <p v-if="searchQuery">Tidak ada buku yang cocok dengan "{{ searchQuery }}"</p>
        <p v-else>Belum ada buku tercatat.</p>
        <button v-if="!searchQuery" class="btn btn-primary mt-4" @click="goToAdd">
          + Tambah Buku Pertama
        </button>
      </div>
    </div>

    <!-- Info -->
    <div class="info-box">
      <strong>💡 Tips:</strong> Posisi rak buku bisa ditentukan nanti melalui menu <RouterLink to="/admin/inventory">Absen Buku</RouterLink>.
    </div>
  </div>
</template>

<style scoped>
.admin-catalog {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.page-header h1 {
  font-family: var(--font-heading);
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
}

.subtitle {
  color: var(--gray);
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
}

.btn {
  padding: 0.625rem 1.25rem;
  border: 1px solid var(--black);
  font-size: 0.875rem;
  cursor: pointer;
  font-family: var(--font-body);
  font-weight: 500;
}

.btn-primary {
  background: var(--black);
  color: var(--white);
}

.btn-primary:hover {
  background: var(--accent);
  border-color: var(--accent);
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.search-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border);
  font-size: 1rem;
  font-family: var(--font-body);
}

.search-input:focus {
  outline: none;
  border-color: var(--black);
}

.search-count {
  color: var(--gray);
  font-size: 0.875rem;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--gray);
}

.book-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.book-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--white);
  border: 1px solid var(--border);
  transition: border-color 0.15s ease;
}

.book-item:hover {
  border-color: var(--black);
}

.book-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}

.book-code {
  font-family: var(--font-mono, monospace);
  font-size: 0.875rem;
  color: var(--gray);
  min-width: 80px;
  text-align: center;
  flex-shrink: 0;
}

.book-info {
  flex: 1;
  min-width: 0;
}

.book-title {
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-meta {
  display: flex;
  gap: 1rem;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--gray);
}

.meta-item.no-posisi {
  color: #e65100;
  font-style: italic;
}

.book-status {
  flex-shrink: 0;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge.borrowed {
  background: #fff3e0;
  color: #e65100;
}

.badge.available {
  background: #e8f5e9;
  color: #2e7d32;
}

.book-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-action {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  background: var(--white);
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.btn-action:hover {
  border-color: var(--black);
}

.btn-action.edit:hover {
  background: #e3f2fd;
  border-color: #1976d2;
  color: #1976d2;
}

.btn-action.delete:hover {
  background: #ffebee;
  border-color: #c62828;
  color: #c62828;
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--gray);
  background: var(--white);
  border: 1px solid var(--border);
}

.info-box {
  margin-top: 2rem;
  padding: 1rem;
  background: #f5f5f5;
  font-size: 0.875rem;
  color: var(--gray);
}

.info-box a {
  color: var(--accent);
  font-weight: 500;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .book-item {
    flex-wrap: wrap;
  }
  
  .book-main {
    width: 100%;
  }
  
  .book-status {
    flex: 1;
  }
}
</style>
