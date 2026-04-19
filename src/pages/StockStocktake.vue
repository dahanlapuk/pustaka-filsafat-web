<template>
  <div class="page">
    <Navbar />
    <main class="container">
      <h1>Stocktake</h1>
      <p class="sub">Rekonsiliasi stok fisik vs sistem</p>

      <section class="card">
        <div class="row">
          <input v-model="sessionCode" placeholder="Kode sesi (opsional)" class="input" />
          <button class="btn primary" @click="createSession" :disabled="loading || currentSessionId">Buat Sesi</button>
          <button class="btn" @click="closeSession" :disabled="loading || !currentSessionId">Tutup Sesi</button>
        </div>
        <p v-if="currentSessionId" class="small">Session aktif: #{{ currentSessionId }}</p>
      </section>

      <section class="card" v-if="currentSessionId">
        <h2>Tambah Entry</h2>
        <div class="grid">
          <select v-model.number="entry.book_id" class="input">
            <option :value="0">Pilih buku</option>
            <option v-for="b in books" :key="b.id" :value="b.id">{{ b.judul }}</option>
          </select>
          <select v-model.number="entry.posisi_id" class="input">
            <option :value="null">Semua posisi</option>
            <option v-for="p in posisi" :key="p.id" :value="p.id">{{ p.kode }} - {{ p.rak }}</option>
          </select>
          <input v-model.number="entry.physical_qty" class="input" type="number" min="0" placeholder="Qty fisik" />
        </div>
        <textarea v-model="entry.notes" class="input" placeholder="Catatan" rows="2" />
        <button class="btn primary" @click="submitEntry" :disabled="loading || !entry.book_id">Simpan Entry</button>
      </section>

      <section class="card" v-if="session.entries.length">
        <h2>Entries</h2>
        <table class="table">
          <thead>
            <tr><th>Buku</th><th>Posisi</th><th>Sistem</th><th>Fisik</th><th>Selisih</th></tr>
          </thead>
          <tbody>
            <tr v-for="e in session.entries" :key="e.id">
              <td>{{ e.book_title }}</td>
              <td>{{ e.posisi_kode || '-' }}</td>
              <td>{{ e.system_qty }}</td>
              <td>{{ e.physical_qty }}</td>
              <td :class="e.discrepancy === 0 ? 'ok' : 'warn'">{{ e.discrepancy }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import Navbar from '../components/Navbar.vue'
import { addStocktakeEntry, closeStocktakeSession, getBooks, getPosisi, getStocktakeSession, startStocktakeSession } from '../api'

const loading = ref(false)
const sessionCode = ref('')
const currentSessionId = ref(null)
const books = ref([])
const posisi = ref([])
const session = ref({ entries: [] })
const entry = ref({ book_id: 0, posisi_id: null, physical_qty: 0, notes: '' })

async function loadMaster() {
  const [{ data: b }, { data: p }] = await Promise.all([getBooks({ page: 1, limit: 500 }), getPosisi()])
  books.value = Array.isArray(b) ? b : (b?.books || [])
  posisi.value = Array.isArray(p) ? p : []
}

async function createSession() {
  loading.value = true
  try {
    const { data } = await startStocktakeSession({ session_code: sessionCode.value })
    currentSessionId.value = data.id
    await refreshSession()
  } finally {
    loading.value = false
  }
}

async function submitEntry() {
  loading.value = true
  try {
    await addStocktakeEntry(currentSessionId.value, entry.value)
    entry.value = { book_id: 0, posisi_id: null, physical_qty: 0, notes: '' }
    await refreshSession()
  } finally {
    loading.value = false
  }
}

async function refreshSession() {
  if (!currentSessionId.value) return
  const { data } = await getStocktakeSession(currentSessionId.value)
  session.value = data || { entries: [] }
}

async function closeSession() {
  if (!currentSessionId.value) return
  loading.value = true
  try {
    await closeStocktakeSession(currentSessionId.value)
    await refreshSession()
  } finally {
    loading.value = false
  }
}

onMounted(loadMaster)
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg-page); color: var(--text-primary); }
.container { max-width: 980px; margin: 0 auto; padding: 1.5rem; }
.sub { color: var(--text-secondary); margin-bottom: 1rem; }
.card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; padding: 1rem; margin-bottom: 1rem; }
.row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 0.5rem; margin-bottom: 0.5rem; }
.input { width: 100%; padding: 0.65rem; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-elevated); color: var(--text-primary); }
.btn { padding: 0.65rem 1rem; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-elevated); color: var(--text-primary); cursor: pointer; }
.btn.primary { background: var(--text-primary); color: var(--text-inverse); }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { border-bottom: 1px solid var(--border); padding: 0.5rem; text-align: left; }
.ok { color: #0a7b34; }
.warn { color: #b35b00; }
.small { color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.5rem; }
@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
</style>
