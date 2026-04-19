<template>
  <div class="inventory-page">
    <h1 class="page-title">Absen Buku</h1>
    <p class="page-subtitle">Verifikasi posisi buku di setiap rak</p>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-value">{{ stats.total }}</span>
        <span class="stat-label">Total Buku</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ stats.checked }}</span>
        <span class="stat-label">Sudah Dicek</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ stats.unchecked }}</span>
        <span class="stat-label">Belum Dicek</span>
      </div>
      <div class="stat-card accent">
        <span class="stat-value">{{ stats.checked_today }}</span>
        <span class="stat-label">Dicek Hari Ini</span>
      </div>
    </div>

    <!-- Petugas Input -->
    <div class="form-group">
      <label for="petugas">Nama Petugas</label>
      <input 
        type="text" 
        id="petugas" 
        v-model="checkedBy" 
        placeholder="Masukkan nama petugas..."
        class="input"
      />
    </div>

    <!-- Pilih Posisi -->
    <div class="form-group">
      <label for="posisi">Pilih Posisi Rak</label>
      <select id="posisi" v-model="selectedPosisi" @change="loadBooks" class="input">
        <option value="">-- Pilih posisi --</option>
        <option v-for="p in posisiList" :key="p.id" :value="p.id">
          {{ p.kode }} - {{ p.rak }}
        </option>
      </select>
    </div>

    <!-- Book List -->
    <div v-if="books.length > 0" class="book-check-section">
      <div class="section-header">
        <h2>Buku di {{ selectedPosisiLabel }}</h2>
        <div class="selection-actions">
          <button class="btn btn-outline" @click="selectAll">Pilih Semua</button>
          <button class="btn btn-outline" @click="deselectAll">Batal Pilih</button>
        </div>
      </div>

      <div class="book-check-list">
        <div 
          v-for="book in books" 
          :key="book.id" 
          class="book-check-item"
          :class="{
            'selected': selectedBooks.has(book.id),
            'checked-before': book.last_checked
          }"
          @click="toggleBook(book.id)"
        >
          <div class="check-indicator">
            <span v-if="selectedBooks.has(book.id)" class="check-icon">✓</span>
          </div>
          <div class="book-info">
            <span class="book-kode">{{ book.kode || '-' }}</span>
            <span class="book-title">{{ book.judul }}</span>
          </div>
          <div class="book-meta">
            <span v-if="book.is_dipinjam" class="badge badge-warning">Dipinjam</span>
            <span v-if="book.last_checked" class="last-checked" :title="'Oleh: ' + (book.checked_by || '-')">
              Dicek: {{ formatDate(book.last_checked) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Move Position Option -->
      <div class="move-section">
        <label class="checkbox-label">
          <input type="checkbox" v-model="moveToNewPosisi" />
          Pindahkan buku terpilih ke posisi lain
        </label>
        <select v-if="moveToNewPosisi" v-model="newPosisiId" class="input">
          <option value="">-- Pilih posisi baru --</option>
          <option v-for="p in posisiList" :key="p.id" :value="p.id">
            {{ p.kode }} - {{ p.rak }}
          </option>
        </select>
      </div>

      <!-- Submit Button -->
      <button 
        class="btn btn-primary btn-lg" 
        :disabled="selectedBooks.size === 0 || !checkedBy || saving"
        @click="submitCheck"
      >
        {{ saving ? 'Menyimpan...' : `Tandai ${selectedBooks.size} Buku Sudah Dicek` }}
      </button>
    </div>

    <div v-else-if="selectedPosisi && !loading" class="empty-state">
      <p>Tidak ada buku di posisi ini.</p>
    </div>

    <div v-if="loading" class="loading">Memuat...</div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { getPosisi, getInventoryStats, getBooksByPosisi, checkInventory } from '../api'
import { useAdmin } from '../stores/admin'

export default {
  name: 'Inventory',
  setup() {
    const { adminNama } = useAdmin()
    const posisiList = ref([])
    const selectedPosisi = ref('')
    const books = ref([])
    const selectedBooks = reactive(new Set())
    // Auto-fill dengan nama admin yang login
    const checkedBy = ref(adminNama.value || localStorage.getItem('inventoryPetugas') || '')
    const moveToNewPosisi = ref(false)
    const newPosisiId = ref('')
    const loading = ref(false)
    const saving = ref(false)
    const stats = reactive({
      total: 0,
      checked: 0,
      unchecked: 0,
      checked_today: 0
    })

    const selectedPosisiLabel = computed(() => {
      const p = posisiList.value.find(x => x.id === selectedPosisi.value)
      return p ? `${p.kode} - ${p.rak}` : ''
    })

    const loadStats = async () => {
      try {
        const res = await getInventoryStats()
        Object.assign(stats, res.data)
      } catch (err) {
        console.error('Error loading stats:', err)
      }
    }

    const loadPosisi = async () => {
      try {
        const res = await getPosisi()
        posisiList.value = res.data
      } catch (err) {
        console.error('Error loading posisi:', err)
      }
    }

    const loadBooks = async () => {
      if (!selectedPosisi.value) {
        books.value = []
        return
      }

      loading.value = true
      selectedBooks.clear()
      
      try {
        const res = await getBooksByPosisi(selectedPosisi.value)
        books.value = res.data
      } catch (err) {
        console.error('Error loading books:', err)
      } finally {
        loading.value = false
      }
    }

    const toggleBook = (id) => {
      if (selectedBooks.has(id)) {
        selectedBooks.delete(id)
      } else {
        selectedBooks.add(id)
      }
    }

    const selectAll = () => {
      books.value.forEach(b => selectedBooks.add(b.id))
    }

    const deselectAll = () => {
      selectedBooks.clear()
    }

    const formatDate = (date) => {
      if (!date) return '-'
      return new Date(date).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    }

    const submitCheck = async () => {
      if (selectedBooks.size === 0 || !checkedBy.value) return

      // Save petugas name to localStorage
      localStorage.setItem('inventoryPetugas', checkedBy.value)

      saving.value = true
      try {
        const payload = {
          book_ids: Array.from(selectedBooks),
          checked_by: checkedBy.value
        }

        if (moveToNewPosisi.value && newPosisiId.value) {
          payload.new_posisi_id = parseInt(newPosisiId.value)
        }

        await checkInventory(payload)
        
        // Reload data
        await loadBooks()
        await loadStats()
        
        alert(`Berhasil menandai ${selectedBooks.size} buku`)
        selectedBooks.clear()
        moveToNewPosisi.value = false
        newPosisiId.value = ''
      } catch (err) {
        console.error('Error submitting check:', err)
        alert('Gagal menyimpan: ' + (err.response?.data?.error || err.message))
      } finally {
        saving.value = false
      }
    }

    onMounted(() => {
      loadPosisi()
      loadStats()
    })

    return {
      posisiList,
      selectedPosisi,
      selectedPosisiLabel,
      books,
      selectedBooks,
      checkedBy,
      moveToNewPosisi,
      newPosisiId,
      loading,
      saving,
      stats,
      loadBooks,
      toggleBook,
      selectAll,
      deselectAll,
      formatDate,
      submitCheck
    }
  }
}
</script>

<style scoped>
.inventory-page {
  max-width: 900px;
  margin: 0 auto;
}

.page-title {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.page-subtitle {
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  padding: 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-card.accent {
  background: var(--accent);
  color: var(--text-inverse);
  border-color: var(--accent);
}

.stat-value {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 700;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.8;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  font-size: 1rem;
  font-family: var(--font-body);
}

.input:focus {
  outline: none;
  border-color: var(--black);
}

.book-check-section {
  margin-top: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h2 {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 600;
}

.selection-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-strong);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  font-family: var(--font-body);
  transition: all 0.15s ease;
}

.btn:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.btn-outline {
  background: transparent;
}

.btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--text-inverse);
  width: 100%;
  padding: 1rem;
  font-size: 1rem;
  font-weight: 600;
  margin-top: 1.5rem;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}

.book-check-list {
  border: 1px solid var(--border);
  max-height: 400px;
  overflow-y: auto;
}

.book-check-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.1s ease;
}

.book-check-item:last-child {
  border-bottom: none;
}

.book-check-item:hover {
  background: var(--bg-elevated);
}

.book-check-item.selected {
  background: var(--accent);
  color: var(--text-inverse);
}

.book-check-item.selected .book-meta {
  color: rgba(255,255,255,0.8);
}

.book-check-item.checked-before:not(.selected) {
  background: var(--success-bg);
}

.check-indicator {
  width: 24px;
  height: 24px;
  border: 2px solid currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  flex-shrink: 0;
}

.check-icon {
  font-weight: bold;
}

.book-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.book-kode {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  opacity: 0.7;
}

.book-title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  flex-shrink: 0;
  margin-left: 1rem;
}

.badge {
  padding: 0.125rem 0.5rem;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-warning {
  background: #ffc107;
  color: var(--text-inverse);
}

.last-checked {
  font-style: italic;
}

.move-section {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input {
  width: 18px;
  height: 18px;
}

.move-section .input {
  margin-top: 1rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .book-check-item {
    flex-wrap: wrap;
  }
  
  .book-meta {
    width: 100%;
    flex-direction: row;
    justify-content: flex-end;
    margin-left: 34px;
    margin-top: 0.5rem;
  }
}
</style>
