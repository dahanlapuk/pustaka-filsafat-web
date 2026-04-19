<template>
  <div class="page">
    <Navbar />
    <main class="container">
      <h1>Loan Audit Dashboard</h1>
      <p class="sub">Ringkasan alokasi pinjaman dan histori per posisi</p>

      <section class="stats card">
        <div class="stat"><span>Total</span><strong>{{ summary.total_loans || 0 }}</strong></div>
        <div class="stat"><span>Aktif</span><strong>{{ summary.active_loans || 0 }}</strong></div>
        <div class="stat"><span>Kembali</span><strong>{{ summary.returned_loans || 0 }}</strong></div>
      </section>

      <section class="card">
        <h2>Distribusi Posisi</h2>
        <div class="bars">
          <div v-for="row in summary.by_posisi || []" :key="row.posisi_id || row.posisi_kode" class="bar-row">
            <div class="label">{{ row.posisi_kode || 'Tanpa Posisi' }}</div>
            <div class="bar"><span :style="{ width: widthPct(row.total) + '%' }" /></div>
            <div class="val">{{ row.total }}</div>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Histori Alokasi</h2>
        <div class="filters">
          <input v-model="filters.date_from" type="date" class="input" />
          <input v-model="filters.date_to" type="date" class="input" />
          <input v-model="filters.posisi_id" placeholder="Posisi ID" class="input" />
          <input v-model="filters.book_id" placeholder="Book ID" class="input" />
          <button class="btn" @click="loadHistory">Filter</button>
        </div>
        <table class="table">
          <thead>
            <tr><th>Loan</th><th>Buku</th><th>Peminjam</th><th>Posisi</th><th>Qty</th><th>Tgl Pinjam</th></tr>
          </thead>
          <tbody>
            <tr v-for="h in history" :key="h.loan_id + '-' + (h.posisi_id || 0)">
              <td>#{{ h.loan_id }}</td>
              <td>{{ h.book_title }}</td>
              <td>{{ h.borrower }}</td>
              <td>{{ h.posisi_kode || '-' }}</td>
              <td>{{ h.qty || '-' }}</td>
              <td>{{ h.tanggal_pinjam }}</td>
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
import { getLoanAuditHistory, getLoanAuditSummary } from '../api'

const summary = ref({ by_posisi: [] })
const history = ref([])
const filters = ref({ date_from: '', date_to: '', posisi_id: '', book_id: '' })

function widthPct(v) {
  const max = Math.max(...(summary.value.by_posisi || []).map((x) => x.total || 0), 1)
  return Math.round(((v || 0) / max) * 100)
}

async function loadSummary() {
  const { data } = await getLoanAuditSummary()
  summary.value = data || { by_posisi: [] }
}

async function loadHistory() {
  const params = Object.fromEntries(Object.entries(filters.value).filter(([, v]) => v))
  const { data } = await getLoanAuditHistory(params)
  history.value = data?.history || []
}

onMounted(async () => {
  await loadSummary()
  await loadHistory()
})
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg-page); color: var(--text-primary); }
.container { max-width: 1080px; margin: 0 auto; padding: 1.5rem; }
.sub { color: var(--text-secondary); margin-bottom: 1rem; }
.card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; padding: 1rem; margin-bottom: 1rem; }
.stats { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 0.75rem; }
.stat { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem; }
.stat span { display:block; color: var(--text-secondary); font-size: 0.85rem; }
.stat strong { font-size: 1.4rem; }
.bars { display: grid; gap: 0.5rem; }
.bar-row { display: grid; grid-template-columns: 150px 1fr 50px; gap: 0.5rem; align-items: center; }
.bar { height: 10px; background: var(--bg-elevated); border-radius: 999px; overflow: hidden; }
.bar span { display: block; height: 100%; background: var(--text-primary); }
.filters { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 0.5rem; margin-bottom: 0.75rem; }
.input { padding: 0.6rem; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-elevated); color: var(--text-primary); }
.btn { padding: 0.6rem; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-elevated); color: var(--text-primary); cursor: pointer; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { border-bottom: 1px solid var(--border); padding: 0.5rem; text-align: left; font-size: 0.92rem; }
@media (max-width: 768px) { .stats, .filters, .bar-row { grid-template-columns: 1fr; } }
</style>
