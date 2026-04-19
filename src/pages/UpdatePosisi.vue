<script setup>
import { ref, computed, onMounted } from 'vue'
import { getBooks, getPosisi, batchUpdatePosisi, updateBook, getBookStockBreakdown, updateBookStockBreakdown } from '../api'
import { useAdmin } from '../stores/admin'
import PosisiSelector from '../components/PosisiSelector.vue'

const { currentAdmin } = useAdmin()

// ── Data ──────────────────────────────────────────────────
const allBooks   = ref([])
const posisiList = ref([])
const loading    = ref(true)
const saving     = ref(false)
const toast      = ref(null)

// ── Mode ──────────────────────────────────────────────────
// 'inline' = satu per satu via dropdown, 'batch' = pilih banyak lalu set posisi
const mode = ref('inline')

// ── Filter ────────────────────────────────────────────────
const filterPosisi   = ref('')
const filterKategori = ref('')
const filterKata     = ref('')

// ── Seleksi (batch mode) ──────────────────────────────────
const selectedIds    = ref(new Set())
const targetPosisiId = ref(null)

// ── Inline (satu-satu via PosisiSelector) ─────────────────
// { bookId: expandedState }
const expandedBook = ref(null)
const inlinePosisiId = ref(null)   // posisi_id yang sedang dipilih
const splitRows = ref([])
const splitLoading = ref(false)
const splitSaving = ref(false)
const splitBookQty = ref(1)

const BOOKS_PAGE_LIMIT = 200

// ── Load data ─────────────────────────────────────────────
onMounted(async () => {
  try {
    const [books, posRes] = await Promise.all([loadAllBooks(), getPosisi()])
    allBooks.value = books
    posisiList.value = posRes.data || []
  } catch (e) {
    console.error('Gagal memuat data update posisi:', e)
    showToast('Gagal memuat daftar buku. Coba refresh halaman.', 'error')
  } finally {
    loading.value = false
  }
})

const loadAllBooks = async () => {
  const books = []
  let page = 1
  let totalPages = 1
  let safety = 0

  do {
    const res = await getBooks({ page, limit: BOOKS_PAGE_LIMIT })
    const payload = res?.data || {}
    const items = Array.isArray(payload) ? payload : (payload.data || [])
    books.push(...items)

    totalPages = Array.isArray(payload) ? 1 : (payload.total_pages || 1)
    page += 1
    safety += 1

    // Guard against unexpected pagination contract loops.
    if (safety > 500) break
  } while (page <= totalPages)

  return books
}

// ── Computed ──────────────────────────────────────────────
const kategoriList = computed(() => {
  const set = new Set()
  allBooks.value.forEach(b => { if (b.kategori_nama) set.add(b.kategori_nama) })
  return [...set].sort()
})

const filteredBooks = computed(() =>
  allBooks.value.filter(b => {
    const matchP   = !filterPosisi.value   || b.posisi_id == filterPosisi.value
    const matchK   = !filterKategori.value || b.kategori_nama === filterKategori.value
    const matchKata = !filterKata.value ||
      b.judul?.toLowerCase().includes(filterKata.value.toLowerCase()) ||
      b.kode?.toLowerCase().includes(filterKata.value.toLowerCase()) ||
      b.kategori_nama?.toLowerCase().includes(filterKata.value.toLowerCase())
    return matchP && matchK && matchKata
  })
)

const selectedCount = computed(() => selectedIds.value.size)
const allSelected   = computed(() =>
  filteredBooks.value.length > 0 &&
  filteredBooks.value.every(b => selectedIds.value.has(b.id))
)
const splitTotalQty = computed(() =>
  splitRows.value.reduce((sum, row) => sum + (Number(row.qty) || 0), 0)
)

// ── Seleksi ───────────────────────────────────────────────
const toggleSelect = (id) => {
  const s = new Set(selectedIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selectedIds.value = s
}

const toggleSelectAll = () => {
  const s = new Set(selectedIds.value)
  if (allSelected.value) filteredBooks.value.forEach(b => s.delete(b.id))
  else filteredBooks.value.forEach(b => s.add(b.id))
  selectedIds.value = s
}

const clearSelection = () => { selectedIds.value = new Set() }

const getBookQty = (book) => {
  const qty = Number(book?.qty)
  if (!Number.isFinite(qty) || qty < 1) return 1
  return Math.floor(qty)
}

const resetSplitState = () => {
  splitRows.value = []
  splitLoading.value = false
  splitSaving.value = false
  splitBookQty.value = 1
}

const upsertLocalBookPosisi = (book, dominantPosisiId) => {
  const b = allBooks.value.find(x => x.id === book.id)
  if (!b) return
  b.posisi_id = dominantPosisiId || null
  const p = posisiList.value.find(x => x.id == dominantPosisiId)
  b.posisi_kode = p?.kode || ''
  b.posisi_rak = p?.rak || ''
}

const loadSplitForBook = async (book) => {
  splitLoading.value = true
  splitRows.value = []
  splitBookQty.value = getBookQty(book)

  try {
    const res = await getBookStockBreakdown(book.id)
    const payload = res?.data || {}
    const allocations = Array.isArray(payload.allocations) ? payload.allocations : []
    splitBookQty.value = Number(payload.book_qty) || getBookQty(book)

    const mapped = allocations
      .filter(a => (Number(a.qty) || 0) > 0)
      .map(a => ({ posisi_id: a.posisi_id ?? null, qty: Number(a.qty) || 0 }))

    if (mapped.length === 0) {
      splitRows.value = [{ posisi_id: book.posisi_id ?? null, qty: splitBookQty.value }]
    } else {
      splitRows.value = mapped
    }
  } catch (e) {
    splitRows.value = [{ posisi_id: book.posisi_id ?? null, qty: splitBookQty.value }]
    showToast('Distribusi stok belum ada, pakai data posisi utama dulu', 'error')
  } finally {
    splitLoading.value = false
  }
}

// ── Inline: buka panel posisi selector ───────────────────
const openInlineEdit = async (book) => {
  if (expandedBook.value === book.id) {
    expandedBook.value = null
    resetSplitState()
    return
  }

  expandedBook.value = book.id
  inlinePosisiId.value = book.posisi_id ?? null

  if (getBookQty(book) > 1) {
    await loadSplitForBook(book)
  } else {
    resetSplitState()
  }
}

const saveInline = async (book) => {
  if (getBookQty(book) > 1) {
    const targetQty = splitBookQty.value
    if (splitRows.value.length === 0) {
      showToast('Tambahkan minimal satu alokasi posisi', 'error')
      return
    }

    const invalidQty = splitRows.value.some(row => !Number.isFinite(Number(row.qty)) || Number(row.qty) < 0)
    if (invalidQty) {
      showToast('Qty alokasi harus angka 0 atau lebih', 'error')
      return
    }

    const invalidPosisi = splitRows.value.some(row => !row.posisi_id && Number(row.qty) > 0)
    if (invalidPosisi) {
      showToast('Pilih posisi untuk semua alokasi yang qty > 0', 'error')
      return
    }

    if (splitTotalQty.value !== targetQty) {
      showToast(`Total alokasi harus sama dengan qty buku (${targetQty})`, 'error')
      return
    }

    splitSaving.value = true
    try {
      await updateBookStockBreakdown(book.id, {
        allocations: splitRows.value.map(row => ({
          posisi_id: row.posisi_id ? Number(row.posisi_id) : null,
          qty: Number(row.qty) || 0,
        })),
        admin_id: currentAdmin.value?.id,
        admin_nama: currentAdmin.value?.nama,
      })

      const dominant = [...splitRows.value]
        .filter(row => (Number(row.qty) || 0) > 0)
        .sort((a, b) => (Number(b.qty) || 0) - (Number(a.qty) || 0))[0]

      upsertLocalBookPosisi(book, dominant?.posisi_id || null)
      showToast(`Split posisi untuk "${book.judul.slice(0, 30)}..." diperbarui`)
      expandedBook.value = null
      resetSplitState()
    } catch (e) {
      showToast(e.response?.data?.error || 'Gagal menyimpan split posisi', 'error')
    } finally {
      splitSaving.value = false
    }
    return
  }

  if (!inlinePosisiId.value || inlinePosisiId.value == book.posisi_id) {
    expandedBook.value = null
    return
  }
  try {
    await updateBook(book.id, {
      ...book,
      posisi_id:   inlinePosisiId.value || null,
      kategori_id: book.kategori_id || null,
      admin_id:    currentAdmin.value?.id,
      admin_nama:  currentAdmin.value?.nama,
    })
    upsertLocalBookPosisi(book, inlinePosisiId.value)
    showToast(`Posisi "${book.judul.slice(0, 30)}..." diperbarui`)
    expandedBook.value = null
  } catch (e) {
    showToast('Gagal memperbarui posisi', 'error')
  }
}

// ── Batch update ──────────────────────────────────────────
const saveBatch = async () => {
  if (!targetPosisiId.value) { showToast('Pilih posisi tujuan terlebih dahulu', 'error'); return }
  if (selectedCount.value === 0) { showToast('Pilih minimal satu buku', 'error'); return }

  saving.value = true
  try {
    const res = await batchUpdatePosisi({
      book_ids:   [...selectedIds.value],
      posisi_id:  parseInt(targetPosisiId.value),
      admin_id:   currentAdmin.value?.id,
      admin_nama: currentAdmin.value?.nama,
    })
    const posisi = posisiList.value.find(p => p.id == targetPosisiId.value)
    selectedIds.value.forEach(id => {
      const b = allBooks.value.find(x => x.id === id)
      if (b) {
        b.posisi_id   = parseInt(targetPosisiId.value)
        b.posisi_kode = posisi?.kode || ''
        b.posisi_rak  = posisi?.rak  || ''
      }
    })
    showToast(`${res.data.updated} buku berhasil dipindah ke ${posisi?.kode || '-'}`)
    clearSelection()
    targetPosisiId.value = null
  } catch (e) {
    showToast(e.response?.data?.error || 'Gagal memperbarui posisi', 'error')
  } finally {
    saving.value = false
  }
}

// ── Toast ─────────────────────────────────────────────────
const showToast = (msg, type = 'success') => {
  toast.value = { msg, type }
  setTimeout(() => { toast.value = null }, 3500)
}

const addSplitRow = () => {
  splitRows.value.push({ posisi_id: null, qty: 0 })
}

const removeSplitRow = (index) => {
  if (splitRows.value.length <= 1) return
  splitRows.value.splice(index, 1)
}
</script>

<template>
  <div class="page-wrap" style="padding: 1.5rem; max-width: 1400px;">
    <Transition name="toast-fade">
      <div v-if="toast" :class="`toast toast-${toast.type}`">{{ toast.msg }}</div>
    </Transition>

    <div class="page-header">
      <div>
        <h1 class="page-title">Update Posisi Buku</h1>
        <p class="page-subtitle">Pindahkan posisi rak satu per satu atau sekaligus</p>
      </div>
      <!-- Mode toggle -->
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn" :class="mode === 'inline' ? 'btn-primary' : 'btn-secondary'" @click="mode = 'inline'">
          Satu per Satu
        </button>
        <button class="btn" :class="mode === 'batch' ? 'btn-primary' : 'btn-secondary'" @click="mode = 'batch'; clearSelection()">
          Seleksi Massal
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">Memuat data buku...</div>

    <div v-else class="posisi-layout">
      <!-- ── Sidebar Filter ───────────────────────────── -->
      <aside class="filter-sidebar section-card">
        <div style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 1rem;">Filter</div>

        <div class="form-group">
          <label class="form-label">Dari Posisi</label>
          <select v-model="filterPosisi">
            <option value="">Semua Posisi</option>
            <option v-for="p in posisiList" :key="p.id" :value="p.id">
              {{ p.kode }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Kategori</label>
          <select v-model="filterKategori">
            <option value="">Semua Kategori</option>
            <option v-for="k in kategoriList" :key="k" :value="k">{{ k }}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Cari Judul / Kode</label>
          <input v-model="filterKata" type="text" placeholder="Ketik kata kunci..." />
        </div>

        <div style="font-size: 0.75rem; color: var(--text-muted); padding-top: 0.75rem; border-top: 1px solid var(--border);">
          {{ filteredBooks.length }} buku ditampilkan
        </div>

        <!-- Batch panel -->
        <div v-if="mode === 'batch' && selectedCount > 0" class="batch-panel">
          <div style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.75rem;">
            {{ selectedCount }} buku dipilih
          </div>
          <div class="form-group">
            <label class="form-label">Pindah ke Posisi</label>
            <select v-model="targetPosisiId">
              <option :value="null">— Pilih Posisi —</option>
              <option v-for="p in posisiList" :key="p.id" :value="p.id">{{ p.kode }}</option>
            </select>
          </div>
          <button class="btn btn-primary" style="width: 100%; margin-bottom: 0.5rem;" :disabled="saving" @click="saveBatch">
            {{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}
          </button>
          <button class="btn btn-ghost" style="width: 100%;" @click="clearSelection">Batalkan Seleksi</button>
        </div>
      </aside>

      <!-- ── Tabel Buku ────────────────────────────────── -->
      <div class="table-wrap" style="flex: 1; overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th v-if="mode === 'batch'" style="width: 40px; text-align: center;">
                <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" />
              </th>
              <th style="width: 90px;">Kode</th>
              <th>Judul</th>
              <th style="width: 130px;">Kategori</th>
              <th style="width: 80px;">Qty</th>
              <th style="width: 130px;">Posisi Saat Ini</th>
              <th v-if="mode === 'inline'" style="width: 90px;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="filteredBooks.length === 0">
              <tr><td :colspan="6" class="empty-state" style="padding: 2rem;">Tidak ada buku ditemukan</td></tr>
            </template>

            <template v-for="book in filteredBooks" :key="book.id">
              <tr :class="{ 'row-selected': selectedIds.has(book.id) }">
                <td v-if="mode === 'batch'" style="text-align: center;">
                  <input type="checkbox" :checked="selectedIds.has(book.id)" @change="toggleSelect(book.id)" />
                </td>
                <td>
                  <code style="font-size: 0.78rem; color: var(--text-muted);">{{ book.kode || '—' }}</code>
                </td>
                <td style="font-weight: 500; max-width: 300px;">{{ book.judul }}</td>
                <td>
                  <span class="badge badge-default" style="font-size: 0.7rem;">{{ book.kategori_nama || '—' }}</span>
                </td>
                <td>
                  <span class="badge badge-default" style="font-size: 0.7rem;">{{ getBookQty(book) }}</span>
                </td>
                <td>
                  <span v-if="book.posisi_kode" class="posisi-code">{{ book.posisi_kode }}</span>
                  <span v-else style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Belum ada</span>
                </td>
                <td v-if="mode === 'inline'">
                  <button
                    class="btn btn-secondary btn-sm"
                    :class="{ 'btn-primary': expandedBook === book.id }"
                    @click="openInlineEdit(book)"
                  >
                    {{ expandedBook === book.id ? 'Tutup' : 'Ubah' }}
                  </button>
                </td>
              </tr>

              <!-- Expanded: PosisiSelector untuk buku ini -->
              <tr v-if="mode === 'inline' && expandedBook === book.id" class="expanded-row">
                <td colspan="6" style="padding: 1rem 1rem 1rem 2rem; background: var(--bg-elevated);">
                  <div style="max-width: 700px;">
                    <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em;">
                      {{ getBookQty(book) > 1 ? 'Split posisi untuk' : 'Pilih posisi baru untuk' }}: <em style="text-transform: none; font-weight: 400;">{{ book.judul }}</em>
                    </div>

                    <template v-if="getBookQty(book) > 1">
                      <div v-if="splitLoading" class="loading-state" style="padding: 0.5rem 0;">Memuat distribusi stok...</div>
                      <template v-else>
                        <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.75rem;">
                          Buku ini punya {{ splitBookQty }} eksemplar. Atur pembagian per posisi, total harus pas {{ splitBookQty }}.
                        </p>

                        <div class="split-grid-head">
                          <span>Posisi</span>
                          <span>Qty</span>
                          <span>Aksi</span>
                        </div>

                        <div v-for="(row, idx) in splitRows" :key="`split-${book.id}-${idx}`" class="split-row">
                          <select v-model="row.posisi_id" class="split-select">
                            <option :value="null">— Pilih Posisi —</option>
                            <option v-for="p in posisiList" :key="p.id" :value="p.id">{{ p.kode }}</option>
                          </select>
                          <input v-model.number="row.qty" class="split-qty" type="number" min="0" step="1" />
                          <button class="btn btn-ghost btn-sm" :disabled="splitRows.length <= 1" @click="removeSplitRow(idx)">Hapus</button>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem;">
                          <button class="btn btn-secondary btn-sm" @click="addSplitRow">+ Tambah Baris Posisi</button>
                          <span :style="{ fontSize: '0.82rem', fontWeight: 700, color: splitTotalQty === splitBookQty ? 'var(--text-primary)' : 'var(--danger)' }">
                            Total Alokasi: {{ splitTotalQty }} / {{ splitBookQty }}
                          </span>
                        </div>
                      </template>
                    </template>

                    <template v-else>
                      <PosisiSelector v-model="inlinePosisiId" />
                    </template>

                    <div style="display: flex; gap: 0.75rem; margin-top: 0.75rem;">
                      <button class="btn btn-primary" :disabled="splitSaving" @click="saveInline(book)">{{ splitSaving ? 'Menyimpan...' : 'Simpan' }}</button>
                      <button class="btn btn-ghost" @click="expandedBook = null">Batal</button>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.posisi-layout {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.filter-sidebar {
  width: 240px;
  flex-shrink: 0;
  position: sticky;
  top: 80px;
}

.batch-panel {
  border-top: 2px solid var(--text-primary);
  padding-top: 1rem;
  margin-top: 1rem;
}

.row-selected td { background: var(--accent-subtle) !important; }
.expanded-row td  { border-bottom: 2px solid var(--border-medium); }

.split-grid-head,
.split-row {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 90px 80px;
  gap: 0.5rem;
  align-items: center;
}

.split-grid-head {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 0.4rem;
}

.split-row + .split-row {
  margin-top: 0.45rem;
}

.split-select,
.split-qty {
  border: 1px solid var(--border-medium);
  background: var(--bg-surface);
  color: var(--text-primary);
  padding: 0.45rem 0.55rem;
  font-size: 0.82rem;
}

.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.3s; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(1rem); }

/* Mobile: sidebar jadi atas */
@media (max-width: 768px) {
  .posisi-layout { flex-direction: column; }
  .filter-sidebar { width: 100%; position: static; }
  .split-grid-head,
  .split-row {
    grid-template-columns: 1fr;
  }
}
</style>
