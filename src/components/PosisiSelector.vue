<script setup>
/**
 * PosisiSelector — 4 Dropdown Cascading
 * Format output kode: R{rak}-{baris}{kolom}-{letak}
 * Contoh: R1-A1-B, R2-#5-F, R3-C10-B, R4-A-F
 */
import { ref, computed, watch } from 'vue'
import { getPosisiStruktur, getPosisi } from '../api'

const props = defineProps({
  modelValue: { type: Number, default: null }, // posisi_id
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'change'])

// ── State ─────────────────────────────────────────────────
const allPosisi = ref([])   // dari GET /api/posisi
const struktur  = ref(null) // dari GET /api/posisi/struktur

const selectedRak   = ref(null)
const selectedBaris = ref(null)
const selectedKolom = ref(null)
const selectedLetak = ref(null)

// ── Load data ─────────────────────────────────────────────
async function load() {
  try {
    const [posRes, strRes] = await Promise.all([getPosisi(), getPosisiStruktur()])
    allPosisi.value = posRes.data || []
    struktur.value  = strRes.data || null

    // Jika ada initial value, decode ke 4 komponen
    if (props.modelValue) {
      const match = allPosisi.value.find(p => p.id === props.modelValue)
      if (match) {
        selectedRak.value   = match.rak_no
        selectedBaris.value = match.baris
        selectedKolom.value = match.kolom_no ?? null
        selectedLetak.value = match.letak
      }
    }
  } catch (e) {
    console.error('PosisiSelector: gagal load data', e)
  }
}

load()

// ── Computed options ──────────────────────────────────────
const rakOptions = computed(() => [1, 2, 3, 4])

const barisOptions = computed(() => {
  if (!selectedRak.value || !struktur.value) return []
  const key = `rak${selectedRak.value}`
  return struktur.value[key]?.baris || []
})

const kolomOptions = computed(() => {
  if (!selectedRak.value || !selectedBaris.value || !struktur.value) return []
  const key = `rak${selectedRak.value}`
  const info = struktur.value[key]
  if (!info?.kolom) return [] // Rak 4: tidak ada kolom

  // Baris '#' hanya punya kolom 5
  const khusus = info.baris_kolom_khusus?.[selectedBaris.value]
  return khusus ?? info.kolom
})

const showKolom = computed(() => {
  if (!selectedRak.value || !struktur.value) return true
  const key = `rak${selectedRak.value}`
  return struktur.value[key]?.kolom !== null
})

const letakOptions = computed(() => ['B', 'F'])

const letakLabel = { B: 'B — Back (dalam/belakang)', F: 'F — Front (luar/depan)' }

// ── Kode generated ────────────────────────────────────────
const generatedKode = computed(() => {
  if (!selectedRak.value || !selectedBaris.value || !selectedLetak.value) return null
  if (showKolom.value && !selectedKolom.value) return null

  if (!showKolom.value) {
    // Rak 4: R4-A-B
    return `R${selectedRak.value}-${selectedBaris.value}-${selectedLetak.value}`
  }
  // Rak 1-3: R1-A1-B
  return `R${selectedRak.value}-${selectedBaris.value}${selectedKolom.value}-${selectedLetak.value}`
})

// ── Cari posisi_id berdasarkan kode ──────────────────────
const matchedPosisi = computed(() => {
  if (!generatedKode.value) return null
  return allPosisi.value.find(p => p.kode === generatedKode.value) ?? null
})

// ── Watch: emit changes ───────────────────────────────────
watch(matchedPosisi, (p) => {
  const id = p?.id ?? null
  emit('update:modelValue', id)
  emit('change', { id, kode: generatedKode.value, posisi: p })
})

// ── Reset cascading ───────────────────────────────────────
function onRakChange() {
  selectedBaris.value = null
  selectedKolom.value = null
  selectedLetak.value = null
}

function onBarisChange() {
  selectedKolom.value = null
  selectedLetak.value = null
}

function onKolomChange() {
  selectedLetak.value = null
}
</script>

<template>
  <div class="posisi-selector" :class="{ disabled }">
    <div class="selector-grid">
      <!-- RAK -->
      <div class="sel-group">
        <label class="sel-label">Rak</label>
        <select
          v-model="selectedRak"
          class="sel-input"
          :disabled="disabled"
          @change="onRakChange"
        >
          <option :value="null" disabled>— Pilih Rak —</option>
          <option v-for="r in rakOptions" :key="r" :value="r">Rak {{ r }}</option>
        </select>
      </div>

      <!-- BARIS -->
      <div class="sel-group">
        <label class="sel-label">Baris</label>
        <select
          v-model="selectedBaris"
          class="sel-input"
          :disabled="disabled || !selectedRak"
          @change="onBarisChange"
        >
          <option :value="null" disabled>— Pilih Baris —</option>
          <option v-for="b in barisOptions" :key="b" :value="b">
            {{ b === '#' ? '# (pagar)' : b }}
          </option>
        </select>
      </div>

      <!-- KOLOM (hanya jika bukan Rak 4) -->
      <div class="sel-group" v-if="showKolom">
        <label class="sel-label">Kolom</label>
        <select
          v-model="selectedKolom"
          class="sel-input"
          :disabled="disabled || !selectedBaris"
          @change="onKolomChange"
        >
          <option :value="null" disabled>— Pilih Kolom —</option>
          <option v-for="k in kolomOptions" :key="k" :value="k">{{ k }}</option>
        </select>
      </div>

      <!-- LETAK -->
      <div class="sel-group">
        <label class="sel-label">Letak</label>
        <select
          v-model="selectedLetak"
          class="sel-input"
          :disabled="disabled || (showKolom ? !selectedKolom : !selectedBaris)"
        >
          <option :value="null" disabled>— Pilih Letak —</option>
          <option v-for="l in letakOptions" :key="l" :value="l">{{ letakLabel[l] }}</option>
        </select>
      </div>
    </div>

    <!-- Preview kode yang di-generate -->
    <div v-if="generatedKode" class="kode-preview" :class="{ 'kode-found': matchedPosisi, 'kode-missing': !matchedPosisi }">
      <span class="kode-label">Kode posisi:</span>
      <code class="kode-value">{{ generatedKode }}</code>
      <span v-if="matchedPosisi" class="kode-status">✓ Tersedia (ID: {{ matchedPosisi.id }})</span>
      <span v-else class="kode-status kode-status--error">✗ Tidak ditemukan di database</span>
    </div>

    <div v-else-if="selectedRak" class="kode-preview kode-empty">
      <span class="kode-label">Lengkapi semua pilihan untuk melihat kode posisi</span>
    </div>
  </div>
</template>

<style scoped>
.posisi-selector { width: 100%; }
.posisi-selector.disabled { opacity: 0.5; pointer-events: none; }

.selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.sel-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sel-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.sel-input {
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--border-medium);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  width: 100%;
}

.sel-input:disabled {
  background: var(--bg-elevated);
  color: var(--text-muted);
  cursor: not-allowed;
  opacity: 0.7;
}

.sel-input:focus {
  outline: none;
  border-color: var(--text-primary);
}

/* Preview kode */
.kode-preview {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  font-size: 0.8rem;
  flex-wrap: wrap;
}

.kode-found   { border-color: var(--success); background: var(--success-bg); }
.kode-missing { border-color: var(--warning); background: var(--warning-bg); }
.kode-empty   { color: var(--text-muted); }

.kode-label { color: var(--text-secondary); font-size: 0.75rem; }

.kode-value {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  background: var(--bg-surface);
  padding: 0.1rem 0.4rem;
  border: 1px solid var(--border);
}

.kode-status { font-size: 0.75rem; font-weight: 600; color: var(--success); }
.kode-status--error { color: var(--warning); }

@media (max-width: 480px) {
  .selector-grid { grid-template-columns: 1fr 1fr; }
}
</style>
