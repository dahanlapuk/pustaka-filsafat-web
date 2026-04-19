<template>
  <div class="inventory-transfer-page">
    <Navbar />
    <main class="transfer-container">
      <div class="transfer-header">
        <h1>Pemindahan Stok</h1>
        <p class="subtitle">Pindahkan stok buku dari satu posisi ke posisi lainnya</p>
      </div>

      <div class="transfer-form-section">
        <div class="form-card">
          <h2>Form Pemindahan Stok</h2>

          <div class="form-group">
            <label>Pilih Buku</label>
            <div class="book-search">
              <input
                v-model="searchBook"
                type="text"
                placeholder="Cari judul atau penulis buku..."
                @input="filterBooks"
                class="search-input"
              />
              <div v-if="filteredBooks.length > 0" class="book-list">
                <button
                  v-for="book in filteredBooks"
                  :key="book.id"
                  @click="selectBook(book)"
                  :class="['book-item', { active: selectedBook?.id === book.id }]"
                >
                  <div class="book-title">{{ book.judul }}</div>
                  <div class="book-meta">{{ book.penulis }}</div>
                </button>
              </div>
              <div v-else-if="searchBook && filteredBooks.length === 0" class="no-results">
                Buku tidak ditemukan
              </div>
            </div>
          </div>

          <div v-if="selectedBook" class="form-group">
            <label>Posisi Sumber (Dari)</label>
            <select v-model.number="transferData.from_posisi" class="form-select">
              <option value="">Pilih posisi...</option>
              <option v-for="posisi in availablePosisi" :key="posisi.id" :value="posisi.id">
                {{ posisi.nama }} (Stok: {{ getStockAtPosisi(posisi.id) }} pcs)
              </option>
            </select>
          </div>

          <div v-if="selectedBook && transferData.from_posisi" class="form-group">
            <label>Posisi Tujuan (Ke)</label>
            <select v-model.number="transferData.to_posisi" class="form-select">
              <option value="">Pilih posisi...</option>
              <option
                v-for="posisi in availablePosisi.filter(p => p.id !== transferData.from_posisi)"
                :key="posisi.id"
                :value="posisi.id"
              >
                {{ posisi.nama }}
              </option>
            </select>
          </div>

          <div v-if="transferData.from_posisi && transferData.to_posisi" class="form-group">
            <label>Jumlah Stok</label>
            <div class="qty-input-group">
              <input
                v-model.number="transferData.quantity"
                type="number"
                min="1"
                :max="currentSourceStock"
                class="form-input"
                placeholder="Masukkan jumlah"
              />
              <span class="max-qty">Max: {{ currentSourceStock }} pcs</span>
            </div>
          </div>

          <div class="form-group">
            <label>Catatan (Opsional)</label>
            <textarea
              v-model="transferData.notes"
              class="form-textarea"
              placeholder="Alasan pemindahan, kondisi stok, dll..."
              rows="3"
            ></textarea>
          </div>

          <div class="form-actions">
            <button
              @click="submitTransfer"
              :disabled="!canSubmit || loading"
              class="btn btn-primary"
            >
              <span v-if="!loading">Konfirmasi Pemindahan</span>
              <span v-else>Memproses...</span>
            </button>
            <button @click="resetForm" class="btn btn-secondary" :disabled="loading">
              Reset
            </button>
          </div>
        </div>
      </div>

      <!-- Recent Transfers -->
      <div class="recent-transfers-section">
        <div class="form-card">
          <h2>Riwayat Pemindahan Terakhir</h2>
          <div class="transfers-table">
            <div class="table-header">
              <div class="col-book">Buku</div>
              <div class="col-from">Dari</div>
              <div class="col-to">Ke</div>
              <div class="col-qty">Jumlah</div>
              <div class="col-time">Waktu</div>
            </div>
            <div v-if="recentTransfers.length === 0" class="no-transfers">
              Belum ada pemindahan stok
            </div>
            <div v-for="transfer in recentTransfers" :key="transfer.id" class="table-row">
              <div class="col-book">{{ transfer.book_title }}</div>
              <div class="col-from">{{ transfer.from_posisi_name }}</div>
              <div class="col-to">{{ transfer.to_posisi_name }}</div>
              <div class="col-qty">{{ transfer.quantity }} pcs</div>
              <div class="col-time">{{ formatTime(transfer.created_at) }}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Navbar from '../components/Navbar.vue'
import { getBooks, getPosisi, getActivityLogs, transferInventory, getBookStockAvailability } from '../api'

const searchBook = ref('')
const books = ref([])
const posisi = ref([])
const selectedBook = ref(null)
const loading = ref(false)
const recentTransfers = ref([])

const transferData = ref({
  book_id: null,
  from_posisi: '',
  to_posisi: '',
  quantity: '',
  notes: ''
})

const filteredBooks = computed(() => {
  if (!searchBook.value) return []
  const search = searchBook.value.toLowerCase()
  return books.value.filter(
    b => b.judul.toLowerCase().includes(search) || b.penulis.toLowerCase().includes(search)
  )
})

const availablePosisi = computed(() => posisi.value)

const currentSourceStock = computed(() => {
  if (!selectedBook.value || !transferData.value.from_posisi) return 0
  const alloc = selectedBook.value.allocations || []
  const loc = alloc.find(a => a.posisi_id === transferData.value.from_posisi)
  return loc ? loc.quantity : 0
})

const canSubmit = computed(() => {
  return selectedBook.value &&
    transferData.value.from_posisi &&
    transferData.value.to_posisi &&
    transferData.value.quantity > 0 &&
    transferData.value.quantity <= currentSourceStock
})

function selectBook(book) {
  selectedBook.value = book
  transferData.value.book_id = book.id
  transferData.value.from_posisi = ''
  transferData.value.to_posisi = ''
  transferData.value.quantity = ''
  searchBook.value = ''
  loadBookAvailability(book.id)
}

function getStockAtPosisi(posisiId) {
  if (!selectedBook.value) return 0
  const alloc = selectedBook.value.allocations || []
  const loc = alloc.find(a => a.posisi_id === posisiId)
  return loc ? loc.quantity : 0
}

async function submitTransfer() {
  loading.value = true
  try {
    const { data } = await transferInventory(transferData.value)
    if (data.success) {
      alert('Pemindahan stok berhasil!')
      resetForm()
      loadRecentTransfers()
      loadBooks()
    } else {
      alert('Gagal: ' + data.message)
    }
  } catch (error) {
    alert('Error: ' + (error.response?.data?.message || error.message || 'Terjadi kesalahan'))
  } finally {
    loading.value = false
  }
}

function resetForm() {
  selectedBook.value = null
  transferData.value = {
    book_id: null,
    from_posisi: '',
    to_posisi: '',
    quantity: '',
    notes: ''
  }
  searchBook.value = ''
}

async function loadBooks() {
  try {
    const { data } = await getBooks({ page: 1, limit: 500 })
    const rows = Array.isArray(data) ? data : (Array.isArray(data?.books) ? data.books : [])
    books.value = rows
  } catch (error) {
    console.error('Error loading books:', error)
  }
}

async function loadPosisi() {
  try {
    const { data } = await getPosisi()
    posisi.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error loading posisi:', error)
  }
}

async function loadRecentTransfers() {
  try {
    const { data } = await getActivityLogs({ action: 'INVENTORY_TRANSFER', limit: 10 })
    const rows = Array.isArray(data) ? data : (Array.isArray(data?.logs) ? data.logs : [])
    if (rows.length > 0) {
      recentTransfers.value = rows.map(log => ({
        id: log.id,
        created_at: log.created_at,
        book_title: log.entity_name || (log.details?.book_title ?? `Book #${log.entity_id ?? ''}`),
        from_posisi_name: log.details?.from_posisi_name || `Posisi ${log.details?.from_posisi ?? '-'}`,
        to_posisi_name: log.details?.to_posisi_name || `Posisi ${log.details?.to_posisi ?? '-'}`,
        quantity: log.details?.qty || 0
      }))
    } else {
      recentTransfers.value = []
    }
  } catch (error) {
    console.error('Error loading transfers:', error)
  }
}

async function loadBookAvailability(bookId) {
  try {
    const { data } = await getBookStockAvailability(bookId)
    const availability = Array.isArray(data?.availability_by_posisi) ? data.availability_by_posisi : []
    selectedBook.value = {
      ...selectedBook.value,
      allocations: availability.map((row) => ({
        posisi_id: row.posisi_id,
        quantity: row.available_qty
      }))
    }
  } catch (error) {
    console.error('Error loading availability:', error)
  }
}

function formatTime(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID') + ' ' + date.toLocaleTimeString('id-ID')
}

onMounted(() => {
  loadBooks()
  loadPosisi()
  loadRecentTransfers()
})
</script>

<style scoped>
.inventory-transfer-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-page);
}

.transfer-container {
  flex: 1;
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  width: 100%;
}

.transfer-header {
  margin-bottom: 2rem;
}

.transfer-header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.subtitle {
  font-size: 0.95rem;
  color: var(--text-secondary);
}

.transfer-form-section,
.recent-transfers-section {
  margin-bottom: 2rem;
}

.form-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 2rem;
}

.form-card h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.form-select,
.form-input,
.form-textarea,
.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-family: inherit;
}

.form-select:focus,
.form-input:focus,
.form-textarea:focus,
.search-input:focus {
  outline: none;
  border-color: var(--text-primary);
  background: var(--bg-elevated);
}

.book-search {
  position: relative;
}

.book-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 6px 6px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 10;
}

.book-item {
  display: block;
  width: 100%;
  padding: 0.75rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}

.book-item:hover,
.book-item.active {
  background: var(--bg-page);
}

.book-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.book-meta {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.no-results {
  padding: 1rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.qty-input-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.qty-input-group .form-input {
  flex: 1;
}

.max-qty {
  font-size: 0.85rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.95rem;
  flex: 1;
}

.btn-primary {
  background: var(--text-primary);
  color: var(--text-inverse);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.85;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-page);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.transfers-table {
  background: var(--bg-elevated);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.5fr 1fr 1.5fr;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  align-items: center;
}

.table-header {
  background: var(--bg-page);
  font-weight: 600;
  color: var(--text-primary);
}

.table-row {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.table-row:last-child {
  border-bottom: none;
}

.no-transfers {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .transfer-container {
    padding: 1rem;
  }

  .form-card {
    padding: 1.5rem;
  }

  .table-header,
  .table-row {
    grid-template-columns: 1fr 0.8fr 0.8fr 0.6fr 1fr;
    font-size: 0.85rem;
    gap: 0.5rem;
  }

  .qty-input-group {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
