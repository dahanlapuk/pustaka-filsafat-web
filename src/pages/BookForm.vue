<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBook, createBook, updateBook, getCategories } from '../api'
import { useAdmin } from '../stores/admin'
import PosisiSelector from '../components/PosisiSelector.vue'

const route  = useRoute()
const router = useRouter()
const { currentAdmin } = useAdmin()

const isEdit    = computed(() => !!route.params.id)
const pageTitle = computed(() => isEdit.value ? 'Edit Buku' : 'Tambah Buku')

const loading = ref(false)
const saving  = ref(false)
const error   = ref(null)
const success = ref(null)

const categories = ref([])
const tagInput = ref('')
const selectedTags = ref([])
const showSuggestions = ref(false)

const form = ref({
  kode:        '',
  judul:       '',
  kategori_id: null,
  posisi_id:   null,
  qty:         1,
  keterangan:  '',
  tahun:       null,
  penulis:     ''
})

const tagSuggestions = computed(() => {
  const query = normalizeTagName(tagInput.value).toLowerCase()
  const selectedSet = new Set(
    selectedTags.value.map(t => (t.nama || '').toLowerCase())
  )

  return categories.value
    .filter(cat => !selectedSet.has((cat.nama || '').toLowerCase()))
    .filter(cat => !query || (cat.nama || '').toLowerCase().includes(query))
    .slice(0, 8)
})

// ── Load data ─────────────────────────────────────────────
const fetchBook = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const res  = await getBook(route.params.id)
    const book = res.data
    form.value = {
      kode:        book.kode        || '',
      judul:       book.judul       || '',
      kategori_id: book.kategori_id || null,
      posisi_id:   book.posisi_id   || null,
      qty:         book.qty         || 1,
      keterangan:  book.keterangan  || '',
      tahun:       book.tahun       || null,
      penulis:     book.penulis     || ''
    }

    selectedTags.value = (book.tags || []).map(t => ({
      id: t.id,
      nama: t.nama,
      isNew: false,
    }))
  } catch {
    error.value = 'Gagal memuat data buku'
  } finally {
    loading.value = false
  }
}

const fetchCategories = async () => {
  try {
    const res = await getCategories()
    categories.value = res.data || []
  } catch { /* ignore */ }
}

onMounted(() => {
  fetchCategories()
  fetchBook()
})

const normalizeTagName = (value) => {
  return (value || '')
    .trim()
    .replace(/^#+/, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

const isTagSelected = (nama) => {
  const key = (nama || '').toLowerCase()
  return selectedTags.value.some(t => (t.nama || '').toLowerCase() === key)
}

const addTagFromInput = () => {
  const normalized = normalizeTagName(tagInput.value)
  if (!normalized) return
  if (isTagSelected(normalized)) {
    tagInput.value = ''
    showSuggestions.value = false
    return
  }

  const existing = categories.value.find(c => (c.nama || '').toLowerCase() === normalized.toLowerCase())
  if (existing) {
    selectedTags.value.push({ id: existing.id, nama: existing.nama, isNew: false })
  } else {
    selectedTags.value.push({ id: null, nama: normalized, isNew: true })
  }

  tagInput.value = ''
  showSuggestions.value = false
}

const addTagSuggestion = (cat) => {
  if (!cat || isTagSelected(cat.nama)) return
  selectedTags.value.push({ id: cat.id, nama: cat.nama, isNew: false })
  tagInput.value = ''
  showSuggestions.value = false
}

const removeTag = (index) => {
  selectedTags.value.splice(index, 1)
}

const onTagKeydown = (event) => {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    addTagFromInput()
    return
  }

  if (event.key === 'Backspace' && !tagInput.value && selectedTags.value.length > 0) {
    selectedTags.value.pop()
  }
}

// ── Submit ────────────────────────────────────────────────
const handleSubmit = async () => {
  error.value   = null
  success.value = null

  if (!form.value.judul.trim()) {
    error.value = 'Judul buku wajib diisi'
    return
  }

  saving.value = true
  try {
    const payload = {
      kode:        form.value.kode.trim() || null,
      judul:       form.value.judul.trim(),
      kategori_id: form.value.kategori_id || null,
      tag_ids:     selectedTags.value.filter(t => Number.isInteger(t.id)).map(t => t.id),
      tag_names:   selectedTags.value.filter(t => !Number.isInteger(t.id)).map(t => t.nama),
      posisi_id:   form.value.posisi_id   || null,
      qty:         parseInt(form.value.qty) || 1,
      keterangan:  form.value.keterangan.trim() || null,
      admin_id:    currentAdmin.value?.id,
      admin_nama:  currentAdmin.value?.nama,
    }

    if (isEdit.value) {
      await updateBook(route.params.id, payload)
      success.value = 'Buku berhasil diupdate'
    } else {
      await createBook(payload)
      success.value = 'Buku berhasil ditambahkan'
      form.value = { kode: '', judul: '', kategori_id: null, posisi_id: null, qty: 1, keterangan: '' }
      selectedTags.value = []
    }
    setTimeout(() => router.push('/admin/books'), 1500)
  } catch (e) {
    error.value = e.response?.data?.error || 'Gagal menyimpan buku'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page-wrap" style="padding: 1.5rem;">
    <div style="max-width: 640px;">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ pageTitle }}</h1>
          <p class="page-subtitle">{{ isEdit ? 'Ubah informasi dan posisi buku' : 'Tambah buku baru ke katalog' }}</p>
        </div>
        <button class="btn btn-ghost" @click="router.back()">← Kembali</button>
      </div>

      <div v-if="loading" class="loading-state">Memuat data buku...</div>

      <form v-else @submit.prevent="handleSubmit">
        <!-- Alert error / success -->
        <div v-if="error"   class="error-banner"   style="margin-bottom: 1.25rem;">{{ error }}</div>
        <div v-if="success" class="success-banner" style="margin-bottom: 1.25rem;">✓ {{ success }}</div>

        <!-- Judul -->
        <div class="form-group">
          <label class="form-label">Judul Buku <span style="color: var(--danger);">*</span></label>
          <input v-model="form.judul" type="text" placeholder="Masukkan judul buku" required />
        </div>

        <!-- Kode + Qty row -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Kode Buku</label>
            <input v-model="form.kode" type="text" placeholder="190.9 KAN k" />
            <span class="form-hint">Kode klasifikasi (opsional)</span>
          </div>
          <div class="form-group">
            <label class="form-label">Jumlah Eksemplar</label>
            <input v-model="form.qty" type="number" min="1" max="999" style="max-width: 100px;" />
          </div>
          <div class="form-group">
            <label class="form-label">Tahun</label>
            <input v-model="form.tahun" type="number" min="1900" :max="new Date().getFullYear() + 1" placeholder="2023" style="max-width: 100px;" />
          </div>
        </div>

        <!-- Penulis -->
        <div class="form-group">
          <label class="form-label">Penulis / Pengarang</label>
          <input v-model="form.penulis" type="text" placeholder="Nama penulis (opsional)" />
          <span class="form-hint">Nama penulis atau pengarang (opsional)</span>
        </div>

        <!-- Kategori -->
        <div class="form-group">
          <label class="form-label">Kategori</label>
          <select v-model="form.kategori_id">
            <option :value="null">— Pilih Kategori —</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.nama }}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Tag Hashtag</label>
          <div class="tag-input-wrap" @click="$event.currentTarget.querySelector('input')?.focus()">
            <span
              v-for="(tag, idx) in selectedTags"
              :key="`selected-tag-${idx}-${tag.nama}`"
              class="tag-chip"
              :class="{ 'tag-chip--new': tag.isNew }"
            >
              #{{ tag.nama }}
              <button type="button" class="tag-chip-remove" @click.stop="removeTag(idx)">×</button>
            </span>
            <input
              v-model="tagInput"
              type="text"
              class="tag-input"
              placeholder="Ketik hashtag lalu Enter, contoh: #fenomenologi"
              @keydown="onTagKeydown"
              @focus="showSuggestions = true"
              @blur="setTimeout(() => { showSuggestions = false }, 120)"
            />
          </div>
          <div v-if="showSuggestions && tagSuggestions.length" class="tag-suggestions">
            <button
              type="button"
              v-for="cat in tagSuggestions"
              :key="`tag-suggest-${cat.id}`"
              class="tag-suggestion-item"
              @mousedown.prevent="addTagSuggestion(cat)"
            >
              #{{ cat.nama }}
            </button>
          </div>
          <span class="form-hint">Tag baru boleh diketik bebas, tag lama akan muncul sebagai saran.</span>
        </div>

        <!-- Posisi — PosisiSelector cascading -->
        <div class="form-group">
          <label class="form-label">Posisi Rak</label>
          <PosisiSelector v-model="form.posisi_id" />
          <span class="form-hint">Pilih posisi menggunakan dropdown bertingkat (opsional, bisa diisi nanti)</span>
        </div>

        <!-- Keterangan -->
        <div class="form-group">
          <label class="form-label">Keterangan</label>
          <textarea v-model="form.keterangan" rows="3" placeholder="Catatan tambahan (opsional)"></textarea>
        </div>

        <!-- Actions -->
        <div class="modal-actions" style="border-top: 1px solid var(--border); padding-top: 1.25rem; margin-top: 0.5rem;">
          <button type="button" class="btn btn-secondary" @click="router.back()">Batal</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Menyimpan...' : (isEdit ? 'Update Buku' : 'Tambah Buku') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.form-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  align-items: start;
}

.tag-input-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  padding: 0.45rem;
  border-radius: 8px;
  min-height: 44px;
}

.tag-input {
  border: none;
  outline: none;
  flex: 1;
  min-width: 180px;
  background: transparent;
  color: var(--text-primary);
  padding: 0.2rem;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
}

.tag-chip--new {
  border-color: var(--accent);
  color: var(--accent-strong);
  background: var(--accent-subtle);
}

.tag-chip-remove {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 0.95rem;
  line-height: 1;
  padding: 0;
}

.tag-suggestions {
  margin-top: 0.35rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-surface);
  overflow: hidden;
}

.tag-suggestion-item {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--border);
  background: transparent;
  text-align: left;
  padding: 0.45rem 0.65rem;
  cursor: pointer;
  color: var(--text-primary);
}

.tag-suggestion-item:last-child {
  border-bottom: none;
}

.tag-suggestion-item:hover {
  background: var(--bg-elevated);
}

@media (max-width: 480px) {
  .form-row { grid-template-columns: 1fr; }
}
</style>
