<script setup>
import { ref, onMounted, computed } from 'vue'
import { getLoans, createLoan, returnLoan, getBooks } from '../api'

const loans = ref([])
const books = ref([])
const loading = ref(true)
const error = ref(null)
const showForm = ref(false)
const submitting = ref(false)

const form = ref({
  book_id: null,
  nama_peminjam: '',
  catatan: ''
})

const formError = ref(null)
const formSuccess = ref(null)

// Fetch active loans
const fetchLoans = async () => {
  loading.value = true
  error.value = null
  
  try {
    const response = await getLoans(false) // only active
    loans.value = response.data || []
  } catch (err) {
    error.value = 'Gagal memuat data peminjaman'
    console.error(err)
  } finally {
    loading.value = false
  }
}

// Fetch available books (not borrowed)
const fetchAvailableBooks = async () => {
  try {
    const response = await getBooks({ status: 'tersedia' })
    books.value = response.data || []
  } catch (err) {
    console.error('Failed to load books:', err)
  }
}

// Handle borrow
const handleSubmit = async () => {
  formError.value = null
  formSuccess.value = null
  
  if (!form.value.book_id) {
    formError.value = 'Pilih buku yang akan dipinjam'
    return
  }
  if (!form.value.nama_peminjam.trim()) {
    formError.value = 'Nama peminjam wajib diisi'
    return
  }
  
  submitting.value = true
  
  try {
    await createLoan({
      book_id: parseInt(form.value.book_id),
      nama_peminjam: form.value.nama_peminjam.trim(),
      catatan: form.value.catatan.trim() || null
    })
    
    formSuccess.value = 'Peminjaman berhasil dicatat'
    form.value = { book_id: null, nama_peminjam: '', catatan: '' }
    showForm.value = false
    
    // Refresh data
    fetchLoans()
    fetchAvailableBooks()
    
  } catch (err) {
    formError.value = err.response?.data?.error || 'Gagal mencatat peminjaman'
    console.error(err)
  } finally {
    submitting.value = false
  }
}

// Handle return
const handleReturn = async (loanId) => {
  if (!confirm('Tandai buku ini sudah dikembalikan?')) return
  
  try {
    await returnLoan(loanId)
    fetchLoans()
    fetchAvailableBooks()
  } catch (err) {
    alert('Gagal mengembalikan buku: ' + (err.response?.data?.error || err.message))
    console.error(err)
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const daysSinceBorrowed = (dateStr) => {
  if (!dateStr) return 0
  const borrowed = new Date(dateStr)
  const today = new Date()
  const diff = Math.floor((today - borrowed) / (1000 * 60 * 60 * 24))
  return diff
}

onMounted(() => {
  fetchLoans()
  fetchAvailableBooks()
})
</script>

<template>
  <div class="container mt-6">
    <div class="loans-page">
      <!-- Header -->
      <div class="page-header">
        <h1 class="page-title">Peminjaman Buku</h1>
        <button 
          class="btn btn-primary" 
          @click="showForm = !showForm"
        >
          {{ showForm ? 'Tutup Form' : '+ Catat Peminjaman' }}
        </button>
      </div>

      <!-- Form Peminjaman -->
      <div v-if="showForm" class="loan-form-card mt-5">
        <h3 class="form-title">Catat Peminjaman Baru</h3>
        
        <div v-if="formError" class="alert alert-error mb-4">
          {{ formError }}
        </div>
        
        <div v-if="formSuccess" class="alert alert-success mb-4">
          {{ formSuccess }}
        </div>
        
        <form @submit.prevent="handleSubmit" class="loan-form">
          <div class="form-group">
            <label class="form-label">Pilih Buku <span class="required">*</span></label>
            <select v-model="form.book_id" class="form-input">
              <option :value="null">— Pilih Buku —</option>
              <option v-for="book in books" :key="book.id" :value="book.id">
                {{ book.judul }} {{ book.kode ? `(${book.kode})` : '' }}
              </option>
            </select>
            <span class="form-hint">Hanya menampilkan buku yang tersedia</span>
          </div>
          
          <div class="form-group">
            <label class="form-label">Nama Peminjam <span class="required">*</span></label>
            <input
              v-model="form.nama_peminjam"
              type="text"
              class="form-input"
              placeholder="Nama lengkap peminjam"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Catatan</label>
            <input
              v-model="form.catatan"
              type="text"
              class="form-input"
              placeholder="Opsional"
            />
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="showForm = false">
              Batal
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? 'Menyimpan...' : 'Catat Peminjaman' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading mt-6">
        <p>Memuat data...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="error mt-6">
        <p>{{ error }}</p>
        <button class="btn btn-secondary mt-3" @click="fetchLoans">Coba Lagi</button>
      </div>

      <!-- Empty State -->
      <div v-else-if="loans.length === 0" class="empty-state mt-6">
        <h3>Tidak ada peminjaman aktif</h3>
        <p class="text-muted mt-2">Semua buku tersedia di perpustakaan</p>
      </div>

      <!-- Loans Table -->
      <div v-else class="loans-table-wrapper mt-6">
        <table class="loans-table">
          <thead>
            <tr>
              <th>Buku</th>
              <th>Peminjam</th>
              <th>Tanggal Pinjam</th>
              <th>Durasi</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="loan in loans" :key="loan.id">
              <td>
                <div class="book-info">
                  <span class="book-title">{{ loan.judul_buku }}</span>
                  <span v-if="loan.kode_buku" class="book-code">{{ loan.kode_buku }}</span>
                </div>
              </td>
              <td>
                <span class="borrower-name">{{ loan.nama_peminjam }}</span>
              </td>
              <td>{{ formatDate(loan.tanggal_pinjam) }}</td>
              <td>
                <span 
                  class="duration-badge"
                  :class="{ 'duration-long': daysSinceBorrowed(loan.tanggal_pinjam) > 14 }"
                >
                  {{ daysSinceBorrowed(loan.tanggal_pinjam) }} hari
                </span>
              </td>
              <td>
                <button 
                  class="btn btn-accent btn-sm"
                  @click="handleReturn(loan.id)"
                >
                  Kembalikan
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Summary -->
      <div v-if="!loading && loans.length > 0" class="loans-summary mt-5">
        <span class="summary-text">
          <strong>{{ loans.length }}</strong> buku sedang dipinjam
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loans-page {
  max-width: 900px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.page-title {
  margin: 0;
}

/* Form Card */
.loan-form-card {
  padding: var(--space-5);
  background-color: var(--gray-100);
  border: 2px solid var(--gray-200);
}

.form-title {
  margin-bottom: var(--space-5);
  font-size: 1.125rem;
}

.loan-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
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
}

.form-input:focus {
  outline: none;
  border-color: var(--black);
}

.form-hint {
  font-size: 0.75rem;
  color: var(--gray-500);
}

.form-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  margin-top: var(--space-2);
}

/* Alert */
.alert {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
}

.alert-error {
  background-color: #FEE2E2;
  color: #991B1B;
}

.alert-success {
  background-color: #D1FAE5;
  color: #065F46;
}

/* Table */
.loans-table-wrapper {
  overflow-x: auto;
}

.loans-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.loans-table th,
.loans-table td {
  padding: var(--space-4);
  text-align: left;
  border-bottom: 1px solid var(--gray-200);
}

.loans-table th {
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--gray-600);
  background-color: var(--gray-100);
}

.loans-table tr:hover {
  background-color: var(--gray-50, #FAFAFA);
}

.book-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.book-title {
  font-weight: 500;
}

.book-code {
  font-size: 0.75rem;
  color: var(--gray-500);
}

.borrower-name {
  font-weight: 500;
  color: var(--accent);
}

.duration-badge {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  font-size: 0.75rem;
  font-weight: 600;
  background-color: var(--gray-200);
  border-radius: var(--radius-sm);
}

.duration-long {
  background-color: #FEE2E2;
  color: #991B1B;
}

.btn-sm {
  padding: var(--space-2) var(--space-3);
  font-size: 0.75rem;
}

/* Summary */
.loans-summary {
  padding: var(--space-4);
  background-color: var(--gray-100);
  text-align: center;
}

.summary-text {
  font-size: 0.875rem;
  color: var(--gray-600);
}

/* States */
.loading,
.error,
.empty-state {
  text-align: center;
  padding: var(--space-10);
}

.error {
  color: var(--accent);
}
</style>
