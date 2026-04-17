<script setup>
/**
 * Pagination component — reusable
 * Props:
 *   page        : current page (1-indexed)
 *   totalPages  : total number of pages
 *   total       : total items (untuk label)
 *   limit       : items per page (untuk label)
 * Emits:
 *   page-change(newPage)
 */
import { computed } from 'vue'

const props = defineProps({
  page:       { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
  total:      { type: Number, default: 0 },
  limit:      { type: Number, default: 20 },
})

const emit = defineEmits(['page-change'])

// Generate nomor halaman yang ditampilkan: max 7 item dengan elipsis
const pages = computed(() => {
  const tp = props.totalPages
  const p  = props.page
  if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1)

  const items = []
  if (p <= 4) {
    items.push(1, 2, 3, 4, 5, '…', tp)
  } else if (p >= tp - 3) {
    items.push(1, '…', tp - 4, tp - 3, tp - 2, tp - 1, tp)
  } else {
    items.push(1, '…', p - 1, p, p + 1, '…', tp)
  }
  return items
})

const startItem = computed(() => (props.page - 1) * props.limit + 1)
const endItem   = computed(() => Math.min(props.page * props.limit, props.total))

const go = (p) => {
  if (typeof p !== 'number' || p < 1 || p > props.totalPages || p === props.page) return
  emit('page-change', p)
}
</script>

<template>
  <div class="pagination-wrap" v-if="totalPages > 1 || total > 0">
    <!-- Info: menampilkan X-Y dari Z -->
    <div class="pagination-info">
      Menampilkan {{ startItem }}–{{ endItem }} dari {{ total }} buku
    </div>

    <div class="pagination-controls" v-if="totalPages > 1">
      <!-- Prev -->
      <button
        class="pg-btn"
        :class="{ disabled: page === 1 }"
        :disabled="page === 1"
        @click="go(page - 1)"
        aria-label="Halaman sebelumnya"
      >‹</button>

      <!-- Page numbers -->
      <template v-for="p in pages" :key="p">
        <span v-if="p === '…'" class="pg-ellipsis">…</span>
        <button
          v-else
          class="pg-btn"
          :class="{ active: p === page }"
          @click="go(p)"
          :aria-label="`Halaman ${p}`"
          :aria-current="p === page ? 'page' : undefined"
        >{{ p }}</button>
      </template>

      <!-- Next -->
      <button
        class="pg-btn"
        :class="{ disabled: page === totalPages }"
        :disabled="page === totalPages"
        @click="go(page + 1)"
        aria-label="Halaman berikutnya"
      >›</button>
    </div>
  </div>
</template>

<style scoped>
.pagination-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 0;
  gap: 1rem;
  flex-wrap: wrap;
}

.pagination-info {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.pg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 0.375rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
  font-size: 0.875rem;
  font-family: var(--font-heading);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s ease;
}

.pg-btn:hover:not(.disabled):not(.active) {
  border-color: var(--text-primary);
  background: var(--bg-elevated);
}

.pg-btn.active {
  background: var(--text-primary);
  color: var(--text-inverse);
  border-color: var(--text-primary);
  font-weight: 700;
}

.pg-btn.disabled,
.pg-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pg-ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 32px;
  font-size: 0.875rem;
  color: var(--text-muted);
}

@media (max-width: 480px) {
  .pagination-wrap { justify-content: center; }
  .pagination-info  { width: 100%; text-align: center; }
  .pg-btn { min-width: 28px; height: 28px; font-size: 0.8rem; }
}
</style>
