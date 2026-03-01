<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const breadcrumbs = computed(() => {
  const path = route.path
  const crumbs = [{ label: 'Dashboard', to: '/admin' }]
  
  if (path === '/admin') {
    return crumbs
  }
  
  if (path.startsWith('/admin/books')) {
    crumbs.push({ label: 'Kelola Buku', to: '/admin/books' })
    
    if (path === '/admin/books/add') {
      crumbs.push({ label: 'Tambah Buku', to: null })
    } else if (path.includes('/edit')) {
      crumbs.push({ label: 'Edit', to: null })
    } else if (route.params.id && !path.includes('/edit')) {
      crumbs.push({ label: 'Detail', to: null })
    }
  } else if (path === '/admin/loans') {
    crumbs.push({ label: 'Peminjaman', to: null })
  } else if (path === '/admin/inventory') {
    crumbs.push({ label: 'Absen Buku', to: null })
  } else if (path === '/admin/logs') {
    crumbs.push({ label: 'Log Aktivitas', to: null })
  }
  
  return crumbs
})
</script>

<template>
  <nav class="breadcrumbs" v-if="breadcrumbs.length > 1">
    <template v-for="(crumb, idx) in breadcrumbs" :key="idx">
      <RouterLink v-if="crumb.to" :to="crumb.to" class="crumb-link">
        {{ crumb.label }}
      </RouterLink>
      <span v-else class="crumb-current">{{ crumb.label }}</span>
      <span v-if="idx < breadcrumbs.length - 1" class="crumb-separator">/</span>
    </template>
  </nav>
</template>

<style scoped>
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  background: var(--gray-50);
  border-bottom: 1px solid var(--gray-100);
  font-size: 0.875rem;
}

.crumb-link {
  color: var(--gray-600);
  transition: color 0.15s;
}

.crumb-link:hover {
  color: var(--black);
}

.crumb-separator {
  color: var(--gray-400);
}

.crumb-current {
  color: var(--black);
  font-weight: 500;
}
</style>
