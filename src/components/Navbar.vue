<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { useAdmin } from '../stores/admin'

const router = useRouter()
const { currentAdmin, isLoggedIn, isSuperadmin, logout } = useAdmin()

function handleLogout() {
  logout()
  router.push('/admin/login')
}
</script>

<template>
  <nav class="navbar">
    <RouterLink to="/admin" class="navbar-brand">
      PUSTAKA FILSAFAT
    </RouterLink>
    <div class="navbar-links">
      <RouterLink to="/admin" class="nav-link">Dashboard</RouterLink>
      <RouterLink to="/admin/books" class="nav-link">Kelola Buku</RouterLink>
      <RouterLink to="/admin/loans" class="nav-link">Peminjaman</RouterLink>
      <RouterLink to="/admin/inventory" class="nav-link">Absen Buku</RouterLink>
      <RouterLink to="/admin/logs" class="nav-link">Log</RouterLink>
    </div>
    <div class="navbar-user" v-if="isLoggedIn">
      <span class="user-name">{{ currentAdmin.nama }}</span>
      <span v-if="isSuperadmin" class="badge-super">SA</span>
      <button @click="handleLogout" class="btn-logout">Keluar</button>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  background-color: var(--black);
}

.navbar-brand {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--white);
  letter-spacing: 0.05em;
}

.navbar-brand:hover {
  color: var(--white);
}

.navbar-links {
  display: flex;
  gap: var(--space-5);
  align-items: center;
}

.nav-link {
  font-family: var(--font-heading);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gray-400);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: color 0.2s ease;
}

.nav-link:hover,
.nav-link.router-link-exact-active {
  color: var(--white);
}

.nav-link-accent {
  color: var(--accent);
  border: 1px solid var(--accent);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
}

.nav-link-accent:hover {
  background-color: var(--accent);
  color: var(--white);
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.user-name {
  color: var(--gray-300);
  font-size: 0.875rem;
}

.badge-super {
  background: var(--white);
  color: var(--black);
  font-size: 0.625rem;
  padding: 2px 6px;
  font-weight: 700;
}

.btn-logout {
  background: transparent;
  border: 1px solid var(--gray-500);
  color: var(--gray-400);
  padding: var(--space-1) var(--space-3);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-logout:hover {
  border-color: var(--white);
  color: var(--white);
}
</style>
