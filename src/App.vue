<script setup>
import { RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'
import Navbar from './components/Navbar.vue'
import Breadcrumbs from './components/Breadcrumbs.vue'

const route = useRoute()
const isPublicPage = computed(() => route.meta.public === true)
const isAdminPage = computed(() => route.path.startsWith('/admin') && !route.meta.public)
</script>

<template>
  <div class="app">
    <!-- Navbar hanya tampil di halaman admin -->
    <Navbar v-if="isAdminPage" />
    <Breadcrumbs v-if="isAdminPage" />
    <main :class="{ 'admin-content': isAdminPage }">
      <RouterView />
    </main>
    <!-- Footer untuk admin -->
    <footer v-if="isAdminPage" class="admin-footer">
      <div class="footer-content">
        <span class="footer-left">Pustaka Filsafat © 2026 — Program Studi Ilmu Filsafat Fakultas Ilmu Budaya Universitas Indonesia</span>
        <span class="footer-right">Powered by <strong>Hexadev Technologies</strong></span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.admin-content {
  padding: var(--space-5);
  flex: 1;
}

.admin-footer {
  background: var(--gray-100);
  border-top: 1px solid var(--gray-200);
  padding: var(--space-4) var(--space-5);
  margin-top: auto;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  font-size: 0.75rem;
  color: var(--gray-500);
}

.footer-right {
  color: var(--gray-600);
}

.footer-right strong {
  color: var(--black);
  font-weight: 600;
}
</style>
