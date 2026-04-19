<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { getBooks, searchBooks, getCategories, createLoanRequest, getBookStockBreakdown, getBookStockAvailability } from '../api'
import Pagination from '../components/Pagination.vue'

const books        = ref([])
const categories   = ref([])
const loading      = ref(true)
const isDark = ref(false)

// View mode
const viewMode = ref('card')

// Filters
const searchQuery      = ref('')
const selectedKategori = ref(null)
const selectedTag      = ref(null)
const showSidebar      = ref(false)  // default tutup — dibuka via tombol mobile

// Pagination
const page       = ref(1)
const limit      = ref(20)
const total      = ref(0)
const totalPages = ref(1)

const loanModalOpen = ref(false)
const selectedBook = ref(null)
const loanSubmitting = ref(false)
const loanError = ref('')
const loanSuccess = ref('')
const showLoanForm = ref(false)
const availabilityLoading = ref(false)
const availabilityData = ref(null)
const loanForm = ref({
  nama_pemohon: '',
  whatsapp: '',
  email: '',
  keperluan: ''
})

let searchTimer = null

const loadAllocationForBooks = async (bookList) => {
  for (const book of bookList) {
    const qty = Number(book?.qty) || 1
    if (qty > 1) {
      try {
        const res = await getBookStockBreakdown(book.id)
        const allocations = Array.isArray(res?.data?.allocations) ? res.data.allocations : []
        book.allocations = allocations.filter(a => (Number(a.qty) || 0) > 0)
      } catch (e) {
        book.allocations = []
      }
    } else {
      book.allocations = []
    }
  }
}

const initTheme = () => {
  const saved = localStorage.getItem('pf-theme')
  isDark.value = saved === 'dark'
}

const toggleTheme = () => {
  isDark.value = !isDark.value
  const theme = isDark.value ? 'dark' : 'light'
  localStorage.setItem('pf-theme', theme)
  document.documentElement.setAttribute('data-theme', theme)
}

// Fetch books (dengan pagination)
const fetchBooks = async () => {
  loading.value = true
  try {
    const params = { page: page.value, limit: limit.value }
    if (selectedKategori.value) params.kategori_id = selectedKategori.value
    if (selectedTag.value) params.tag_id = selectedTag.value
    const res       = await getBooks(params)
    const d         = res.data
    const bookList  = d.data        || []
    total.value     = d.total       || 0
    totalPages.value = d.total_pages || 1
    await loadAllocationForBooks(bookList)
    books.value = bookList
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleSearch = (e) => {
  searchQuery.value = e.target.value
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    page.value = 1
    if (!searchQuery.value.trim()) { fetchBooks(); return }
    loading.value = true
    try {
      const res       = await searchBooks(searchQuery.value.trim(), page.value, limit.value, {
        kategori_id: selectedKategori.value || undefined,
        tag_id: selectedTag.value || undefined,
      })
      const d         = res.data
      const bookList  = d.data        || []
      total.value     = d.total       || 0
      totalPages.value = d.total_pages || 1
      await loadAllocationForBooks(bookList)
      books.value = bookList
    } catch (err) {
      console.error(err)
    } finally {
      loading.value = false
    }
  }, 350)
}

const fetchCategories = async () => {
  try {
    const res = await getCategories()
    categories.value = res.data || []
  } catch (err) {
    console.error(err)
  }
}

const selectCategory = (catId) => {
  selectedKategori.value = catId
  searchQuery.value = ''
  page.value = 1
  showSidebar.value = false  // tutup bottom drawer setelah pilih di mobile
}

const selectedCategoryName = computed(() => {
  if (!selectedKategori.value) return 'Semua Buku'
  const cat = categories.value.find(c => c.id === selectedKategori.value)
  return cat ? cat.nama : 'Kategori'
})

const groupedCategories = computed(() => {
  const groups = {
    bentuk: [],
    konten: [],
    lain: [],
    tanpa_group: [],
  }

  for (const cat of categories.value) {
    const key = cat.grouping || 'tanpa_group'
    if (!groups[key]) groups[key] = []
    groups[key].push(cat)
  }

  return groups
})

const selectTag = (tagId) => {
  selectedTag.value = tagId
  page.value = 1
  if (!searchQuery.value.trim()) {
    fetchBooks()
    return
  }

  loading.value = true
  searchBooks(searchQuery.value.trim(), page.value, limit.value, {
    kategori_id: selectedKategori.value || undefined,
    tag_id: selectedTag.value || undefined,
  }).then(async res => {
    const d = res.data
    const bookList = d.data || []
    total.value = d.total || 0
    totalPages.value = d.total_pages || 1
    await loadAllocationForBooks(bookList)
    books.value = bookList
  }).finally(() => {
    loading.value = false
  })
}

const onPageChange = (p) => {
  page.value = p
  if (searchQuery.value.trim()) {
    // re-search dengan page baru
    loading.value = true
    searchBooks(searchQuery.value.trim(), p, limit.value, {
      kategori_id: selectedKategori.value || undefined,
      tag_id: selectedTag.value || undefined,
    }).then(async res => {
      const d = res.data
      const bookList = d.data        || []
      total.value      = d.total       || 0
      totalPages.value = d.total_pages || 1
      await loadAllocationForBooks(bookList)
      books.value = bookList
    }).finally(() => { loading.value = false })
  } else {
    fetchBooks()
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const openLoanModal = async (book) => {
  selectedBook.value = book
  loanError.value = ''
  loanSuccess.value = ''
  showLoanForm.value = false
  availabilityData.value = null
  availabilityLoading.value = true
  loanModalOpen.value = true

  try {
    const res = await getBookStockAvailability(book.id)
    availabilityData.value = res?.data || null
  } catch (e) {
    console.error('Gagal memuat ketersediaan stok:', e)
    availabilityData.value = null
  } finally {
    availabilityLoading.value = false
  }
}

const handleBookEnter = (event, book) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    openLoanModal(book)
  }
}

const closeLoanModal = () => {
  loanModalOpen.value = false
  selectedBook.value = null
  loanSubmitting.value = false
  showLoanForm.value = false
  loanError.value = ''
  loanSuccess.value = ''
}

const openLoanForm = () => {
  showLoanForm.value = true
  loanSuccess.value = ''
  loanError.value = ''
}

const submitLoanRequest = async () => {
  if (!selectedBook.value) return

  const nama = loanForm.value.nama_pemohon.trim()
  const wa = loanForm.value.whatsapp.trim()
  const email = loanForm.value.email.trim()

  if (!nama) {
    loanError.value = 'Nama peminjam wajib diisi.'
    return
  }
  if (!wa && !email) {
    loanError.value = 'Isi minimal WhatsApp atau email.'
    return
  }

  loanSubmitting.value = true
  loanError.value = ''
  loanSuccess.value = ''

  try {
    const payload = {
      book_id: selectedBook.value.id,
      nama_pemohon: nama,
      whatsapp: wa,
      email,
      keperluan: loanForm.value.keperluan.trim(),
    }
    const res = await createLoanRequest(payload)
    loanSuccess.value = res?.data?.message || 'Pengajuan peminjaman berhasil dikirim.'
    loanForm.value = { nama_pemohon: '', whatsapp: '', email: '', keperluan: '' }
    await fetchBooks()
  } catch (err) {
    loanError.value = err?.response?.data?.error || 'Gagal mengirim pengajuan peminjaman.'
  } finally {
    loanSubmitting.value = false
  }
}

watch(selectedKategori, () => {
  if (!searchQuery.value) fetchBooks()
})

watch(limit, () => {
  page.value = 1
  fetchBooks()
})

onMounted(() => {
  initTheme()
  fetchBooks()
  fetchCategories()
})
</script>

<template>
  <div class="public-catalog">
    <!-- Header -->
    <header class="catalog-header">
      <div class="header-content">
        <h1>Pustaka Filsafat</h1>
        <p>Katalog Perpustakaan Program Studi Ilmu Filsafat FIB UI</p>
      </div>
      <button class="catalog-theme-toggle" @click="toggleTheme" :aria-label="isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'">
        <span>{{ isDark ? '☀️' : '🌙' }}</span>
        <span>{{ isDark ? 'Mode Terang' : 'Mode Gelap' }}</span>
      </button>
    </header>

    <!-- Mobile Category Toggle Button -->
    <div class="mobile-cat-bar">
      <button class="mobile-cat-toggle" @click="showSidebar = !showSidebar">
        📁 {{ selectedCategoryName }}
        <span class="mobile-cat-caret">{{ showSidebar ? '▲' : '▼' }}</span>
      </button>
    </div>

    <!-- Mobile Sidebar Overlay -->
    <div v-if="showSidebar" class="sidebar-overlay" @click="showSidebar = false"></div>

    <div class="catalog-layout">
      <!-- Sidebar -->
      <aside class="sidebar" :class="{ open: showSidebar }">
        <div class="sidebar-header">
          <h3>Kategori</h3>
          <button @click="showSidebar = false" class="sidebar-toggle" aria-label="Tutup">✕</button>
        </div>
        <nav class="category-nav">
          <button
            @click="selectCategory(null)"
            class="category-item"
            :class="{ active: selectedKategori === null }"
          >
            <span class="category-icon">📚</span>
            <span class="category-name">Semua Buku</span>
            <span class="category-count">{{ total }}</span>
          </button>
          <button
            v-for="cat in categories"
            :key="cat.id"
            @click="selectCategory(cat.id)"
            class="category-item"
            :class="{ active: selectedKategori === cat.id }"
          >
            <span class="category-icon">📁</span>
            <span class="category-name">{{ cat.nama }}</span>
          </button>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <!-- Search & Controls -->
        <div class="toolbar">
          <div class="search-box">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input 
              type="text"
              class="search-input"
              placeholder="Cari judul, penulis, atau kode buku..."
              :value="searchQuery"
              @input="handleSearch"
            />
          </div>
          
          <div class="view-controls">
            <select v-model="selectedTag" class="tag-filter" @change="selectTag(selectedTag)">
              <option :value="null">Semua Tag</option>
              <optgroup v-if="groupedCategories.bentuk.length" label="Bentuk">
                <option v-for="cat in groupedCategories.bentuk" :key="`tag-bentuk-${cat.id}`" :value="cat.id">{{ cat.nama }}</option>
              </optgroup>
              <optgroup v-if="groupedCategories.konten.length" label="Konten">
                <option v-for="cat in groupedCategories.konten" :key="`tag-konten-${cat.id}`" :value="cat.id">{{ cat.nama }}</option>
              </optgroup>
              <optgroup v-if="groupedCategories.lain.length" label="Lain">
                <option v-for="cat in groupedCategories.lain" :key="`tag-lain-${cat.id}`" :value="cat.id">{{ cat.nama }}</option>
              </optgroup>
              <optgroup v-if="groupedCategories.tanpa_group.length" label="Tanpa Group">
                <option v-for="cat in groupedCategories.tanpa_group" :key="`tag-none-${cat.id}`" :value="cat.id">{{ cat.nama }}</option>
              </optgroup>
            </select>

            <button 
              @click="viewMode = 'card'"
              class="view-btn"
              :class="{ active: viewMode === 'card' }"
              title="Tampilan Kartu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
              </svg>
            </button>
            <button 
              @click="viewMode = 'list'"
              class="view-btn"
              :class="{ active: viewMode === 'list' }"
              title="Tampilan List"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Results Info -->
        <div class="results-info">
          <h2>{{ selectedCategoryName }}</h2>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span class="results-count">{{ total.toLocaleString('id-ID') }} buku</span>
            <select v-model.number="limit" class="results-limit">
              <option v-for="n in [10, 20, 50, 100]" :key="n" :value="n">{{ n }} / halaman</option>
            </select>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Memuat katalog...</p>
        </div>

        <!-- Book Grid (Card View) -->
        <div v-else-if="viewMode === 'card'" class="book-grid">
          <article
            v-for="book in books"
            :key="book.id"
            class="book-card"
            role="button"
            tabindex="0"
            @click="openLoanModal(book)"
            @keydown="handleBookEnter($event, book)"
          >
            <div class="card-header">
              <span class="book-code">{{ book.kode || '—' }}</span>
              <span v-if="book.is_dipinjam" class="status-badge borrowed">Dipinjam</span>
              <span v-else class="status-badge available">Tersedia</span>
            </div>
            <h3 class="book-title">{{ book.judul }}</h3>
            <div class="book-details">
              <p v-if="book.penulis" class="book-author">{{ book.penulis }}</p>
              <p v-if="book.tahun" class="book-year">Tahun: {{ book.tahun }}</p>
              <div class="book-meta">
                <span v-if="book.kategori_nama" class="meta-tag category">{{ book.kategori_nama }}</span>
                <span
                  v-for="tag in (book.tags || [])"
                  :key="`card-tag-${book.id}-${tag.id}`"
                  class="meta-tag tag"
                >#{{ tag.nama }}</span>
                <template v-if="(Number(book.qty) || 1) > 1 && book.allocations && book.allocations.length > 0">
                  <span v-for="alloc in book.allocations" :key="`alloc-${book.id}-${alloc.posisi_id}`" class="meta-tag location">📍 {{ alloc.posisi_kode }} ({{ alloc.qty }})</span>
                </template>
                <span v-else-if="book.posisi_kode" class="meta-tag location">📍 {{ book.posisi_kode }}</span>
              </div>
            </div>
            <div class="card-footer">
              <span v-if="book.penerbit" class="publisher">{{ book.penerbit }}</span>
              <span class="eksemplar">{{ book.qty || 1 }} eks</span>
            </div>
          </article>
        </div>

        <!-- Book List (List View) -->
        <div v-else class="book-list">
          <article
            v-for="book in books"
            :key="book.id"
            class="book-row"
            role="button"
            tabindex="0"
            @click="openLoanModal(book)"
            @keydown="handleBookEnter($event, book)"
          >
            <div class="row-code">{{ book.kode || '—' }}</div>
            <div class="row-info">
              <h3 class="row-title">{{ book.judul }}</h3>
              <div class="row-meta">
                <span v-if="book.penulis">{{ book.penulis }}</span>
                <span v-if="book.penerbit" class="separator">•</span>
                <span v-if="book.penerbit">{{ book.penerbit }}</span>
                <span v-if="book.tahun" class="separator">•</span>
                <span v-if="book.tahun">{{ book.tahun }}</span>
              </div>
            </div>
            <div class="row-category">
              <span v-if="book.kategori_nama">{{ book.kategori_nama }}</span>
              <div class="row-tags" v-if="book.tags && book.tags.length">
                <span v-for="tag in book.tags" :key="`list-tag-${book.id}-${tag.id}`" class="meta-tag tag">#{{ tag.nama }}</span>
              </div>
            </div>
            <div class="row-location">
              <template v-if="(Number(book.qty) || 1) > 1 && book.allocations && book.allocations.length > 0">
                <div class="location-list">
                  <span v-for="alloc in book.allocations" :key="`list-alloc-${book.id}-${alloc.posisi_id}`" class="location-item">📍 {{ alloc.posisi_kode }} ({{ alloc.qty }})</span>
                </div>
              </template>
              <span v-else-if="book.posisi_kode">📍 {{ book.posisi_kode }}</span>
            </div>
            <div class="row-eksemplar">
              <span>{{ book.qty || 1 }} eks</span>
            </div>
            <div class="row-status">
              <span v-if="book.is_dipinjam" class="status-badge borrowed">Dipinjam</span>
              <span v-else class="status-badge available">Tersedia</span>
            </div>
            <div class="row-action">Detail</div>
          </article>
        </div>

        <!-- Empty State -->
        <div v-if="!loading && books.length === 0" class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <p>Tidak ada buku ditemukan</p>
          <button @click="selectCategory(null)" class="reset-btn">Lihat Semua Buku</button>
        </div>

        <!-- Pagination -->
        <Pagination
          v-if="!loading && totalPages > 1"
          :page="page"
          :total-pages="totalPages"
          :total="total"
          :limit="limit"
          @page-change="onPageChange"
          style="margin-top: 1.5rem;"
        />
      </main>
    </div>

    <!-- Footer -->
    <footer class="catalog-footer">
      <div class="footer-content">
        <p>Perpustakaan Program Studi Ilmu Filsafat FIB UI</p>
        <RouterLink to="/members" class="admin-link">Member Archive</RouterLink>
        <RouterLink to="/admin/login" class="admin-link">Admin Panel →</RouterLink>
      </div>
      <p class="watermark">Powered by <strong>Hexadev Technologies</strong></p>
      <RouterLink to="/changelog" class="version-footer">v3.1.0</RouterLink>
    </footer>

    <div v-if="loanModalOpen" class="loan-modal-overlay" @click.self="closeLoanModal">
      <div class="loan-modal">
        <div class="loan-modal-header">
          <h3>Detail Buku & Pengajuan Pinjam</h3>
          <button class="loan-modal-close" @click="closeLoanModal">✕</button>
        </div>

        <div v-if="selectedBook" class="loan-book-detail">
          <h4>{{ selectedBook.judul }}</h4>
          <p v-if="selectedBook.penulis">Penulis: {{ selectedBook.penulis }}</p>
          <p v-if="selectedBook.tahun">Tahun: {{ selectedBook.tahun }}</p>
          <p v-if="selectedBook.kategori_nama">Kategori: {{ selectedBook.kategori_nama }}</p>
          <p v-if="selectedBook.tags && selectedBook.tags.length">
            Tag:
            <span v-for="tag in selectedBook.tags" :key="`modal-tag-${tag.id}`" class="modal-tag">#{{ tag.nama }}</span>
          </p>
          <p v-if="(Number(selectedBook.qty) || 1) > 1 && selectedBook.allocations && selectedBook.allocations.length > 0">
            Posisi:
            <span v-for="alloc in selectedBook.allocations" :key="`modal-alloc-${alloc.posisi_id}`" class="modal-tag">📍 {{ alloc.posisi_kode }} ({{ alloc.qty }})</span>
          </p>
          <p v-else-if="selectedBook.posisi_kode">Posisi: {{ selectedBook.posisi_kode }}</p>
          <p>Stok: {{ selectedBook.qty || 1 }} eksemplar</p>

          <!-- Ketersediaan per posisi -->
          <div v-if="availabilityLoading" style="padding: 0.75rem; background: var(--bg-elevated); border-radius: 4px; font-size: 0.85rem; color: var(--text-muted);">
            Memuat data ketersediaan per posisi...
          </div>
          <div v-else-if="availabilityData && availabilityData.locations && availabilityData.locations.length > 0" style="margin-top: 0.75rem; padding: 0.75rem; background: var(--bg-elevated); border-radius: 4px;">
            <div style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin-bottom: 0.5rem;">Ketersediaan per Posisi</div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
              <div v-for="loc in availabilityData.locations" :key="`avail-${loc.posisi_id}`" style="display: flex; flex-direction: column; padding: 0.4rem 0.6rem; background: var(--bg-surface); border-radius: 3px; font-size: 0.75rem; border-left: 2px solid var(--accent);">
                <span style="font-weight: 600;">{{ loc.posisi_kode || 'Tanpa Posisi' }}</span>
                <span style="color: var(--text-secondary);">{{ loc.available_qty || 0 }}/{{ loc.total_qty }} tersedia</span>
              </div>
            </div>
          </div>
        </div>

        <button
          v-if="selectedBook && !selectedBook.is_dipinjam && !showLoanForm"
          class="loan-submit"
          @click="openLoanForm"
          type="button"
        >
          Pinjam
        </button>

        <p v-if="loanSuccess" class="loan-alert loan-alert--success">{{ loanSuccess }}</p>
        <p v-if="loanError" class="loan-alert loan-alert--error">{{ loanError }}</p>

        <form v-if="selectedBook && !selectedBook.is_dipinjam && showLoanForm" class="loan-form" @submit.prevent="submitLoanRequest">
          <label>
            Nama Peminjam
            <input v-model="loanForm.nama_pemohon" type="text" required />
          </label>
          <label>
            WhatsApp
            <input v-model="loanForm.whatsapp" type="text" placeholder="Opsional jika isi email" />
          </label>
          <label>
            Email
            <input v-model="loanForm.email" type="email" placeholder="Opsional jika isi WhatsApp" />
          </label>
          <label>
            Keperluan
            <textarea v-model="loanForm.keperluan" rows="3" placeholder="Opsional"></textarea>
          </label>

          <button class="loan-submit" :disabled="loanSubmitting" type="submit">
            {{ loanSubmitting ? 'Mengirim...' : 'Ajukan Peminjaman' }}
          </button>
        </form>

        <p v-else-if="selectedBook && selectedBook.is_dipinjam" class="loan-unavailable">
          Buku ini sedang dipinjam. Silakan cek lagi nanti.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.public-catalog {
  min-height: 100vh;
  background: var(--bg-page);
  font-family: var(--font-body);
  display: flex;
  flex-direction: column;
}

/* Header */
.catalog-header {
  background: var(--nav-bg);
  color: var(--nav-text-active);
  padding: 2.5rem 2rem;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.catalog-header h1 {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  letter-spacing: 0.02em;
}

.catalog-header p {
  opacity: 0.8;
  font-size: 0.9rem;
}

.header-content {
  flex: 1;
  text-align: center;
}

.catalog-theme-toggle {
  border: 1px solid var(--border-medium);
  background: var(--bg-elevated);
  color: var(--text-primary);
  border-radius: 999px;
  padding: 0.45rem 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.catalog-theme-toggle:focus-visible,
.book-card:focus-visible,
.book-row:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

/* Layout */
.catalog-layout {
  display: flex;
  flex: 1;
}

/* Sidebar */
.sidebar {
  width: 240px;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  transition: width 0.2s ease;
}

.sidebar.collapsed {
  width: 48px;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1rem;
  border-bottom: 1px solid var(--border);
}

.sidebar-header h3 {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.sidebar-toggle {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.category-nav {
  padding: 0.5rem;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s ease;
  text-align: left;
  color: var(--text-primary);
}

.category-item:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-weight: 600;
}

.category-item.active {
  background: var(--text-primary);
  color: var(--text-inverse);
  font-weight: 700;
}

.category-icon {
  font-size: 1rem;
}

.category-name {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
  color: inherit;
}

.category-count {
  font-size: 0.75rem;
  color: var(--text-muted);
  background: var(--bg-elevated);
  padding: 2px 8px;
  border-radius: 10px;
}

.category-item.active .category-count {
  background: rgba(255,255,255,0.2);
  color: var(--text-inverse);
}

/* Main Content */
.main-content {
  flex: 1;
  padding: 1.5rem 2rem;
  min-width: 0;
}

/* Toolbar */
.toolbar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.search-box {
  flex: 1;
  position: relative;
  max-width: 500px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 3rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: all 0.15s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--border-strong);
  box-shadow: 0 0 0 3px var(--accent-subtle);
}

.view-controls {
  display: flex;
  gap: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.tag-filter {
  min-width: 180px;
  border: none;
  border-right: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-primary);
  padding: 0 0.6rem;
  font-size: 0.8rem;
}

.view-btn {
  padding: 0.75rem;
  background: var(--bg-surface);
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s ease;
}

.view-btn:not(:last-child) {
  border-right: 1px solid var(--border);
}

.view-btn:hover {
  background: var(--bg-elevated);
}

.view-btn.active {
  background: var(--accent);
  color: var(--text-inverse);
}

/* Results Info */
.results-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.results-info h2 {
  font-size: 1.25rem;
  font-weight: 600;
}

.results-count {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.results-limit {
  padding: 0.3rem 0.5rem;
  font-size: 0.8rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-surface);
  color: var(--text-primary);
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: var(--text-secondary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Book Grid (Card View) */
.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.book-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.25rem;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.book-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.book-code {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.status-badge {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
}

.status-badge.available {
  background: var(--success-bg);
  color: var(--success);
}

.status-badge.borrowed {
  background: var(--warning-bg);
  color: var(--warning);
}

.book-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 0.5rem;
  flex: 1;
}

.book-details {
  margin-bottom: 0.75rem;
}

.book-author {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.book-year {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.book-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.meta-tag {
  font-size: 0.7rem;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

.meta-tag.category {
  background: var(--info-bg);
  color: var(--info);
}

.meta-tag.tag {
  background: var(--accent-subtle);
  color: var(--accent-strong);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  padding-top: 0.75rem;
  margin-top: auto;
}

/* Book List (List View) */
.book-list {
  display: flex;
  flex-direction: column;
}

.book-row {
  display: grid;
  grid-template-columns: 100px 1fr 150px 100px 70px 90px 96px;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.25rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-bottom: none;
  transition: all 0.15s ease;
  cursor: pointer;
}

.book-row:first-child {
  border-radius: 8px 8px 0 0;
}

.book-row:last-child {
  border-radius: 0 0 8px 8px;
  border-bottom: 1px solid var(--border);
}

.book-row:only-child {
  border-radius: 8px;
  border-bottom: 1px solid var(--border);
}

.book-row:hover {
  background: var(--bg-elevated);
}

.row-code {
  font-family: var(--font-mono, monospace);
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.row-info {
  min-width: 0;
}

.row-title {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.row-meta .separator {
  margin: 0 0.25rem;
}

.row-category,
.row-location {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.row-tags {
  margin-top: 0.25rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.location-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.location-item {
  font-size: 0.75rem;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

.row-eksemplar {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-align: center;
}

.row-status {
  text-align: right;
}

.row-action {
  text-align: right;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.modal-tag {
  display: inline-block;
  margin-left: 0.35rem;
  margin-top: 0.25rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  font-size: 0.72rem;
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: var(--text-muted);
  text-align: center;
}

.empty-state svg {
  margin-bottom: 1rem;
}

.empty-state p {
  margin-bottom: 1rem;
}

.reset-btn {
  padding: 0.5rem 1rem;
  background: var(--text-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
}

.reset-btn:hover {
  opacity: 0.9;
}

/* Footer */
.catalog-footer {
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  padding: 1.5rem 2rem;
  text-align: center;
  position: relative;
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  margin-bottom: 0.5rem;
}

.footer-content p {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.admin-link {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-decoration: none;
}

.admin-link:hover {
  color: var(--text-primary);
}

.watermark {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.watermark strong {
  color: var(--text-secondary);
}

.version-footer {
  position: absolute;
  bottom: 1.5rem;
  right: 2rem;
  font-size: 0.65rem;
  opacity: 0.4;
  cursor: pointer;
  transition: opacity 0.2s ease;
  text-decoration: none;
  color: var(--text-primary);
}

.version-footer:hover {
  opacity: 0.7;
  text-decoration: underline;
}

.loan-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.loan-modal {
  width: min(640px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
}

.loan-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.loan-modal-close {
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 1rem;
  cursor: pointer;
}

.loan-book-detail {
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
}

.loan-book-detail h4 {
  margin-bottom: 0.4rem;
}

.loan-book-detail p {
  margin: 0.2rem 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.loan-form {
  display: grid;
  gap: 0.6rem;
}

.loan-form label {
  display: grid;
  gap: 0.3rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.loan-form input,
.loan-form textarea {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.6rem;
  background: var(--bg-surface);
  color: var(--text-primary);
}

.loan-submit {
  border: none;
  background: var(--text-primary);
  color: var(--text-inverse);
  border-radius: 6px;
  padding: 0.65rem;
  cursor: pointer;
  font-weight: 600;
}

.loan-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loan-alert {
  margin: 0.5rem 0;
  border-radius: 6px;
  padding: 0.65rem;
  font-size: 0.85rem;
}

.loan-alert--success {
  background: var(--success-bg);
  color: var(--success);
}

.loan-alert--error {
  background: var(--warning-bg);
  color: var(--warning);
}

.loan-unavailable {
  color: var(--warning);
  background: var(--warning-bg);
  padding: 0.75rem;
  border-radius: 6px;
}

/* ── Mobile Category Toggle Bar ──────────────────────── */
.mobile-cat-bar { display: none; }

.mobile-cat-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--bg-elevated);
  border: 2px solid var(--text-primary);
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.mobile-cat-toggle:active {
  background: var(--text-primary);
  color: var(--text-inverse);
}

.mobile-cat-caret {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.sidebar-overlay {
  display: none;
}

/* ── Desktop: sidebar normal ─────────────────────────── */
@media (min-width: 769px) {
  .sidebar { display: block !important; }
  .mobile-cat-bar { display: none !important; }
}

/* ── Mobile ≤768px ──────────────────────────────────── */
@media (max-width: 768px) {
  .mobile-cat-bar {
    display: block;
    padding: 0.75rem 1rem;
    background: var(--bg-page);
  }

  /* Sidebar jadi bottom drawer di mobile */
  .sidebar {
    position: fixed !important;
    left: 0; right: 0; bottom: 0;
    top: auto !important;
    height: 70vh;
    width: 100% !important;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.18);
    z-index: 1001;
    transform: translateY(100%);
    transition: transform 0.3s ease;
    overflow-y: auto;
  }

  .sidebar.open {
    transform: translateY(0);
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
  }

  /* Sembunyikan sidebar di desktop toggle - mobile pakai bottom drawer */
  .catalog-layout { flex-direction: column; }

  .catalog-header { padding: 1.25rem 1rem; }
  .catalog-header { flex-direction: column; }
  .catalog-header h1 { font-size: 1.4rem; }

  .main-content { padding: 0.75rem 1rem; }

  .toolbar { flex-direction: column; }

  .book-grid { grid-template-columns: 1fr; }

  .book-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  .row-category, .row-location, .row-eksemplar { display: none; }
  .row-code { grid-column: 1 / -1; font-size: 0.7rem; margin-bottom: 0.2rem; }
  .row-status, .row-action { text-align: left; }

  /* Buku card lebih compact */
  .book-card { padding: 1rem; }
  .book-title { font-size: 0.9rem; }

  .results-info { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
}
</style>
