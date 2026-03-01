<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { getBooks, searchBooks, getCategories } from '../api'

const books = ref([])
const categories = ref([])
const loading = ref(true)

// View mode: 'card' or 'list'
const viewMode = ref('card')

// Filters
const searchQuery = ref('')
const selectedKategori = ref(null)
const showSidebar = ref(true)

// Fetch books
const fetchBooks = async () => {
  loading.value = true
  try {
    const params = {}
    if (selectedKategori.value) params.kategori_id = selectedKategori.value
    const response = await getBooks(params)
    books.value = response.data || []
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const handleSearch = async (e) => {
  const query = e.target.value
  searchQuery.value = query
  
  if (!query.trim()) {
    fetchBooks()
    return
  }
  
  loading.value = true
  try {
    const response = await searchBooks(query)
    books.value = response.data || []
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
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
}

const selectedCategoryName = computed(() => {
  if (!selectedKategori.value) return 'Semua Buku'
  const cat = categories.value.find(c => c.id === selectedKategori.value)
  return cat ? cat.nama : 'Kategori'
})

watch(selectedKategori, () => {
  if (!searchQuery.value) fetchBooks()
})

onMounted(() => {
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
    </header>

    <div class="catalog-layout">
      <!-- Sidebar -->
      <aside class="sidebar" :class="{ collapsed: !showSidebar }">
        <div class="sidebar-header">
          <h3>Kategori</h3>
          <button @click="showSidebar = !showSidebar" class="sidebar-toggle">
            <span v-if="showSidebar">◀</span>
            <span v-else>▶</span>
          </button>
        </div>
        
        <nav v-if="showSidebar" class="category-nav">
          <button 
            @click="selectCategory(null)"
            class="category-item"
            :class="{ active: selectedKategori === null }"
          >
            <span class="category-icon">📚</span>
            <span class="category-name">Semua Buku</span>
            <span class="category-count">{{ books.length }}</span>
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
          <span class="results-count">{{ books.length }} buku</span>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Memuat katalog...</p>
        </div>

        <!-- Book Grid (Card View) -->
        <div v-else-if="viewMode === 'card'" class="book-grid">
          <article v-for="book in books" :key="book.id" class="book-card">
            <div class="card-header">
              <span class="book-code">{{ book.kode || '—' }}</span>
              <span v-if="book.is_dipinjam" class="status-badge borrowed">Dipinjam</span>
              <span v-else class="status-badge available">Tersedia</span>
            </div>
            <h3 class="book-title">{{ book.judul }}</h3>
            <div class="book-details">
              <p v-if="book.penulis" class="book-author">{{ book.penulis }}</p>
              <div class="book-meta">
                <span v-if="book.kategori_nama" class="meta-tag category">{{ book.kategori_nama }}</span>
                <span v-if="book.posisi_kode" class="meta-tag location">📍 {{ book.posisi_kode }}</span>
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
          <article v-for="book in books" :key="book.id" class="book-row">
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
            </div>
            <div class="row-location">
              <span v-if="book.posisi_kode">📍 {{ book.posisi_kode }}</span>
            </div>
            <div class="row-eksemplar">
              <span>{{ book.qty || 1 }} eks</span>
            </div>
            <div class="row-status">
              <span v-if="book.is_dipinjam" class="status-badge borrowed">Dipinjam</span>
              <span v-else class="status-badge available">Tersedia</span>
            </div>
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
      </main>
    </div>

    <!-- Footer -->
    <footer class="catalog-footer">
      <div class="footer-content">
        <p>Perpustakaan Program Studi Ilmu Filsafat FIB UI</p>
        <RouterLink to="/admin/login" class="admin-link">Admin Panel →</RouterLink>
      </div>
      <p class="watermark">Powered by <strong>Hexadev Technologies</strong></p>
    </footer>
  </div>
</template>

<style scoped>
.public-catalog {
  min-height: 100vh;
  background: var(--gray-50, #f9fafb);
  font-family: var(--font-body);
  display: flex;
  flex-direction: column;
}

/* Header */
.catalog-header {
  background: var(--black);
  color: var(--white);
  padding: 2.5rem 2rem;
  text-align: center;
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

/* Layout */
.catalog-layout {
  display: flex;
  flex: 1;
}

/* Sidebar */
.sidebar {
  width: 260px;
  background: white;
  border-right: 1px solid var(--gray-200, #e5e7eb);
  flex-shrink: 0;
  transition: width 0.2s ease;
}

.sidebar.collapsed {
  width: 48px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1rem;
  border-bottom: 1px solid var(--gray-200, #e5e7eb);
}

.sidebar-header h3 {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--gray-500);
}

.sidebar-toggle {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--gray-400);
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
}

.category-item:hover {
  background: var(--gray-100, #f3f4f6);
}

.category-item.active {
  background: var(--black);
  color: white;
}

.category-icon {
  font-size: 1rem;
}

.category-name {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
}

.category-count {
  font-size: 0.75rem;
  color: var(--gray-400);
  background: var(--gray-100);
  padding: 2px 8px;
  border-radius: 10px;
}

.category-item.active .category-count {
  background: rgba(255,255,255,0.2);
  color: white;
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
  color: var(--gray-400);
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 3rem;
  border: 1px solid var(--gray-300, #d1d5db);
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.15s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--black);
  box-shadow: 0 0 0 3px rgba(0,0,0,0.1);
}

.view-controls {
  display: flex;
  border: 1px solid var(--gray-300);
  border-radius: 8px;
  overflow: hidden;
}

.view-btn {
  padding: 0.75rem;
  background: white;
  border: none;
  cursor: pointer;
  color: var(--gray-500);
  transition: all 0.15s ease;
}

.view-btn:not(:last-child) {
  border-right: 1px solid var(--gray-300);
}

.view-btn:hover {
  background: var(--gray-100);
}

.view-btn.active {
  background: var(--black);
  color: white;
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
  color: var(--gray-500);
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: var(--gray-500);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--gray-200);
  border-top-color: var(--black);
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
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  padding: 1.25rem;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
}

.book-card:hover {
  border-color: var(--black);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
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
  color: var(--gray-500);
}

.status-badge {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
}

.status-badge.available {
  background: #dcfce7;
  color: #166534;
}

.status-badge.borrowed {
  background: #fef3c7;
  color: #92400e;
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
  color: var(--gray-600);
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
  background: var(--gray-100);
  color: var(--gray-600);
}

.meta-tag.category {
  background: #e0e7ff;
  color: #3730a3;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--gray-400);
  border-top: 1px solid var(--gray-100);
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
  grid-template-columns: 100px 1fr 150px 100px 60px 80px;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.25rem;
  background: white;
  border: 1px solid var(--gray-200);
  border-bottom: none;
  transition: all 0.15s ease;
}

.book-row:first-child {
  border-radius: 8px 8px 0 0;
}

.book-row:last-child {
  border-radius: 0 0 8px 8px;
  border-bottom: 1px solid var(--gray-200);
}

.book-row:only-child {
  border-radius: 8px;
  border-bottom: 1px solid var(--gray-200);
}

.book-row:hover {
  background: var(--gray-50);
}

.row-code {
  font-family: var(--font-mono, monospace);
  font-size: 0.8rem;
  color: var(--gray-500);
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
  color: var(--gray-500);
}

.row-meta .separator {
  margin: 0 0.25rem;
}

.row-category,
.row-location {
  font-size: 0.8rem;
  color: var(--gray-600);
}

.row-eksemplar {
  font-size: 0.75rem;
  color: var(--gray-500);
  text-align: center;
}

.row-status {
  text-align: right;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: var(--gray-400);
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
  background: var(--black);
  color: white;
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
  background: white;
  border-top: 1px solid var(--gray-200);
  padding: 1.5rem 2rem;
  text-align: center;
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  margin-bottom: 0.5rem;
}

.footer-content p {
  color: var(--gray-500);
  font-size: 0.85rem;
}

.admin-link {
  font-size: 0.8rem;
  color: var(--gray-500);
  text-decoration: none;
}

.admin-link:hover {
  color: var(--black);
}

.watermark {
  font-size: 0.7rem;
  color: var(--gray-400);
}

.watermark strong {
  color: var(--gray-600);
}

/* Responsive */
@media (max-width: 1024px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 1000;
    box-shadow: 2px 0 8px rgba(0,0,0,0.1);
  }
  
  .sidebar.collapsed {
    transform: translateX(-100%);
  }
  
  .book-row {
    grid-template-columns: 80px 1fr 100px;
  }
  
  .row-category,
  .row-location,
  .row-eksemplar {
    display: none;
  }
}

@media (max-width: 640px) {
  .catalog-header {
    padding: 1.5rem 1rem;
  }
  
  .catalog-header h1 {
    font-size: 1.5rem;
  }
  
  .main-content {
    padding: 1rem;
  }
  
  .toolbar {
    flex-direction: column;
  }
  
  .book-grid {
    grid-template-columns: 1fr;
  }
  
  .book-row {
    grid-template-columns: 1fr auto;
    gap: 0.5rem;
  }
  
  .row-code {
    grid-column: 1 / -1;
    margin-bottom: 0.25rem;
  }
}
</style>
