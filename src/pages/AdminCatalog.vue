<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getBooks, searchBooks, deleteBook } from '../api'
import { useAdmin } from '../stores/admin'
import Pagination from '../components/Pagination.vue'

const router = useRouter()
const { currentAdmin, isSuperadmin } = useAdmin()

// ── State ──────────────────────────────────────────────────
const books       = ref([])
const loading     = ref(true)
const deleting    = ref(null)
const searchQuery = ref('')
const searching   = ref(false)

// Pagination
const page       = ref(1)
const limit      = ref(20)
const total      = ref(0)
const totalPages = ref(1)

const LIMIT_OPTIONS = [10, 20, 50, 100]

// Filter (backend)
const filterKategori = ref('')
const filterStatus   = ref('')

// ── Debounce search ────────────────────────────────────────
let searchTimer = null

// ── Fetch ──────────────────────────────────────────────────
const fetchBooks = async () => {
  loading.value = true
  try {
    let res
    if (searchQuery.value.trim()) {
      res = await searchBooks(searchQuery.value.trim(), page.value, limit.value)
    } else {
      res = await getBooks({
        page:        page.value,
        limit:       limit.value,
        kategori_id: filterKategori.value || undefined,
        status:      filterStatus.value   || undefined,
      })
    }
    const d      = res.data
    books.value  = d.data        || []
    total.value  = d.total       || 0
    totalPages.value = d.total_pages || 1
  } catch (e) {
    console.error('Gagal load buku:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchBooks)

// Watch filter changes → reset to page 1
watch([filterKategori, filterStatus, limit], () => {
  page.value = 1
  fetchBooks()
})

// Watch search input dengan debounce
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchBooks()
  }, 350)
})

const onPageChange = (p) => {
  page.value = p
  fetchBooks()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ── Delete ─────────────────────────────────────────────────
const handleDelete = async (book) => {
  const alasan = prompt(`Alasan menghapus buku "${book.judul}":\n\n(Wajib diisi)`)
  if (!alasan?.trim()) { alert('Alasan wajib diisi'); return }

  const confirmMsg = isSuperadmin.value
    ? `Hapus buku "${book.judul}"?\n\nAlasan: ${alasan}\n\nSebagai Superadmin, buku akan langsung dihapus.`
    : `Request hapus buku "${book.judul}"?\n\nAlasan: ${alasan}\n\nPermintaan akan dicatat untuk persetujuan.`
  if (!confirm(confirmMsg)) return

  deleting.value = book.id
  try {
    await deleteBook(book.id, currentAdmin.value?.id, currentAdmin.value?.nama, isSuperadmin.value, alasan.trim())
    if (isSuperadmin.value) {
      books.value = books.value.filter(b => b.id !== book.id)
      total.value = Math.max(0, total.value - 1)
    } else {
      alert('Permintaan hapus dicatat. Menunggu persetujuan superadmin.')
    }
  } catch (e) {
    alert(e.response?.data?.message || e.response?.data?.error || e.message)
  } finally {
    deleting.value = null
  }
}
</script>

<template>
  <div class="page-wrap" style="padding: 1.5rem;">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Daftar Buku</h1>
        <p class="page-subtitle">{{ total.toLocaleString('id-ID') }} buku tercatat</p>
      </div>
      <button class="btn btn-primary" @click="router.push('/admin/books/add')">
        + Tambah Buku
      </button>
    </div>

    <!-- Controls bar -->
    <div class="controls-bar">
      <!-- Search -->
      <div class="search-wrap">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari judul, kode, atau kategori..."
          style="flex: 1; min-width: 200px;"
        />
      </div>

      <!-- Filter Status -->
      <select v-model="filterStatus" style="width: 140px;">
        <option value="">Semua Status</option>
        <option value="tersedia">Tersedia</option>
        <option value="dipinjam">Dipinjam</option>
      </select>

      <!-- Per page -->
      <div class="perpage-wrap">
        <span class="perpage-label">Tampilkan</span>
        <select v-model.number="limit" style="width: 70px;">
          <option v-for="n in [10, 20, 50, 100]" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">Memuat data buku...</div>

    <!-- Book list -->
    <template v-else>
      <!-- Empty state -->
      <div v-if="books.length === 0" class="empty-state">
        <div class="empty-icon">📚</div>
        <div class="empty-text">
          {{ searchQuery ? `Tidak ada buku yang cocok dengan "${searchQuery}"` : 'Belum ada buku tercatat' }}
        </div>
        <button v-if="!searchQuery" class="btn btn-primary" style="margin-top: 1rem;" @click="router.push('/admin/books/add')">
          + Tambah Buku Pertama
        </button>
      </div>

      <!-- Book list -->
      <div v-else class="book-list">
        <div
          v-for="book in books"
          :key="book.id"
          class="book-item"
          @click="router.push(`/admin/books/${book.id}`)"
        >
          <div class="book-code-block">
            <code>{{ book.kode || '—' }}</code>
          </div>

          <div class="book-info-block">
            <div class="book-title-line">{{ book.judul }}</div>
            <div class="book-meta-line">
              <span v-if="book.kategori_nama">{{ book.kategori_nama }}</span>
              <span v-if="book.posisi_kode" class="posisi-code" style="font-size: 0.75rem;">
                📍 {{ book.posisi_kode }}
              </span>
              <span v-else style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">
                📍 Belum ditentukan
              </span>
            </div>
          </div>

          <div class="book-status-block">
            <span v-if="book.is_dipinjam" class="badge badge-dipinjam">
              Dipinjam · {{ book.peminjam }}
            </span>
            <span v-else class="badge badge-approved" style="color: var(--success); background: var(--success-bg);">
              Tersedia
            </span>
          </div>

          <div class="book-actions-block" @click.stop>
            <button class="btn-icon" title="Edit" @click="router.push(`/admin/books/${book.id}/edit`)">✎</button>
            <button
              class="btn-icon btn-icon--danger"
              title="Hapus"
              :disabled="deleting === book.id"
              @click="handleDelete(book)"
            >{{ deleting === book.id ? '…' : '✕' }}</button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <Pagination
        :page="page"
        :total-pages="totalPages"
        :total="total"
        :limit="limit"
        @page-change="onPageChange"
      />
    </template>
  </div>
</template>

<style scoped>
.controls-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.search-wrap {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 200px;
  gap: 0.5rem;
}

.perpage-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.perpage-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  white-space: nowrap;
}

/* Book list */
.book-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--border);
}

.book-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1.25rem;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.12s;
}

.book-item:last-child { border-bottom: none; }
.book-item:hover { background: var(--bg-elevated); }

.book-code-block {
  min-width: 80px;
  font-size: 0.78rem;
  color: var(--text-muted);
  flex-shrink: 0;
  text-align: center;
}

.book-info-block {
  flex: 1;
  min-width: 0;
}

.book-title-line {
  font-weight: 600;
  font-size: 0.9375rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
}

.book-meta-line {
  display: flex;
  gap: 0.875rem;
  margin-top: 0.2rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.book-status-block {
  flex-shrink: 0;
}

.book-actions-block {
  display: flex;
  gap: 0.375rem;
  flex-shrink: 0;
}

.btn-icon {
  width: 30px;
  height: 30px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s;
}

.btn-icon:hover { border-color: var(--text-primary); color: var(--text-primary); background: var(--bg-elevated); }
.btn-icon--danger:hover { border-color: var(--danger); color: var(--danger); background: var(--danger-bg); }
.btn-icon:disabled { opacity: 0.4; cursor: not-allowed; }

/* Mobile */
@media (max-width: 640px) {
  .book-item { flex-wrap: wrap; padding: 0.75rem 1rem; }
  .book-code-block { min-width: auto; }
  .book-info-block { width: 100%; order: -1; }
  .book-status-block { flex: 1; }
  .controls-bar { flex-direction: column; align-items: stretch; }
  .search-wrap { min-width: 0; }
}
</style>
