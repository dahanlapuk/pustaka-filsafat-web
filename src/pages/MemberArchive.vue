<template>
  <div class="page">
    <Navbar />
    <main class="container">
      <h1>Member Archive</h1>
      <p class="sub">Arsip peminjam dan riwayat pinjam publik</p>

      <section class="card">
        <div class="search-row">
          <input v-model="q" class="input" placeholder="Cari nama peminjam..." />
          <button class="btn" @click="loadMembers">Cari</button>
        </div>
        <div class="list">
          <button v-for="m in members" :key="m.name" class="item" @click="loadProfile(m.name)">
            <div>
              <strong>{{ m.name }}</strong>
              <p>Total pinjam: {{ m.total_borrow }}</p>
            </div>
            <span>{{ m.last_borrow }}</span>
          </button>
        </div>
      </section>

      <section class="card" v-if="profile">
        <h2>{{ profile.name }}</h2>
        <p class="sub">Total: {{ profile.total_borrow }} | Aktif: {{ profile.active_borrow }}</p>
        <table class="table">
          <thead>
            <tr><th>Buku</th><th>Tanggal Pinjam</th><th>Tanggal Kembali</th></tr>
          </thead>
          <tbody>
            <tr v-for="h in history" :key="h.loan_id">
              <td>{{ h.book_title }}</td>
              <td>{{ h.tanggal_pinjam }}</td>
              <td>{{ h.tanggal_kembali || '-' }}</td>
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
import { getMemberProfile, getMembers } from '../api'

const q = ref('')
const members = ref([])
const profile = ref(null)
const history = ref([])

async function loadMembers() {
  const { data } = await getMembers(q.value ? { q: q.value } : {})
  members.value = data?.members || []
}

async function loadProfile(name) {
  const { data } = await getMemberProfile(name)
  profile.value = data?.profile || null
  history.value = data?.history || []
}

onMounted(loadMembers)
</script>

<style scoped>
.page { min-height: 100vh; background: var(--bg-page); color: var(--text-primary); }
.container { max-width: 980px; margin: 0 auto; padding: 1.5rem; }
.sub { color: var(--text-secondary); margin-bottom: 1rem; }
.card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; padding: 1rem; margin-bottom: 1rem; }
.search-row { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
.input { flex: 1; padding: 0.6rem; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-elevated); color: var(--text-primary); }
.btn { padding: 0.6rem 1rem; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-elevated); color: var(--text-primary); cursor: pointer; }
.list { display: grid; gap: 0.5rem; }
.item { display: flex; justify-content: space-between; align-items: center; width: 100%; text-align: left; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem; color: var(--text-primary); cursor: pointer; }
.item p { margin: 0.25rem 0 0; color: var(--text-secondary); font-size: 0.85rem; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { border-bottom: 1px solid var(--border); padding: 0.5rem; text-align: left; }
@media (max-width: 768px) { .search-row { flex-direction: column; } }
</style>
