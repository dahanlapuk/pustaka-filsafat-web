<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useAdmin } from '../stores/admin'

const router = useRouter()
const route = useRoute()
const { currentAdmin, isLoggedIn, isSuperadmin, logout } = useAdmin()

// ── Theme ─────────────────────────────────────────────────
const isDark = ref(false)

function initTheme() {
  isDark.value = localStorage.getItem('pf-theme') === 'dark'
}

function toggleTheme() {
  isDark.value = !isDark.value
  const theme = isDark.value ? 'dark' : 'light'
  localStorage.setItem('pf-theme', theme)
  document.documentElement.setAttribute('data-theme', theme)
}

// ── Mobile Drawer ─────────────────────────────────────────
const drawerOpen = ref(false)
function toggleDrawer() { drawerOpen.value = !drawerOpen.value }
function closeDrawer()  { drawerOpen.value = false }

// ── Desktop Dropdown ──────────────────────────────────────
const activeDropdown = ref(null)

function toggleDropdown(name) {
  activeDropdown.value = activeDropdown.value === name ? null : name
}
function closeDropdown() { activeDropdown.value = null }

// Tutup dropdown jika klik di luar nav-group
function onClickOutside(e) {
  if (!e.target.closest('.nav-group')) closeDropdown()
}

// Tutup drawer saat route berubah
function handleLogout() {
  closeDrawer()
  logout()
}

// ── Pending counts (dari Dashboard jika ada) ──────────────
const pendingLoan = computed(() => 0)   // akan diisi dari store jika perlu
const pendingDelete = computed(() => 0)

onMounted(() => {
  initTheme()
  document.addEventListener('click', onClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <nav class="navbar" role="navigation">
    <!-- Brand -->
    <RouterLink to="/admin" class="navbar-brand" @click="closeDrawer">
      PUSTAKA FILSAFAT
    </RouterLink>

    <!-- Desktop: Nav Links -->
    <div class="nav-links" aria-label="Menu navigasi">

      <RouterLink to="/admin" class="nav-link" exact-active-class="nav-link--active">
        Dashboard
      </RouterLink>

      <!-- Dropdown: Buku -->
      <div class="nav-group">
        <button
          class="nav-link nav-dropdown-trigger"
          :class="{ 'nav-link--active': activeDropdown === 'buku' }"
          @click.stop="toggleDropdown('buku')"
        >Buku <span class="dropdown-caret" :class="{ open: activeDropdown === 'buku' }">▾</span></button>
        <Transition name="dd">
          <div class="nav-dropdown" v-if="activeDropdown === 'buku'">
            <RouterLink to="/admin/books"         class="dropdown-item" @click="closeDropdown">Daftar Buku</RouterLink>
            <RouterLink to="/admin/books/add"     class="dropdown-item" @click="closeDropdown">Tambah Buku</RouterLink>
            <RouterLink to="/admin/update-posisi" class="dropdown-item" @click="closeDropdown">Update Posisi Buku</RouterLink>
          </div>
        </Transition>
      </div>

      <!-- Dropdown: Peminjaman -->
      <div class="nav-group">
        <button
          class="nav-link nav-dropdown-trigger"
          :class="{ 'nav-link--active': activeDropdown === 'pinjam' }"
          @click.stop="toggleDropdown('pinjam')"
        >Peminjaman <span class="dropdown-caret" :class="{ open: activeDropdown === 'pinjam' }">▾</span></button>
        <Transition name="dd">
          <div class="nav-dropdown" v-if="activeDropdown === 'pinjam'">
            <RouterLink to="/admin/loans"         class="dropdown-item" @click="closeDropdown">Catat Pinjam/Kembali</RouterLink>
            <RouterLink to="/admin/loan-requests" class="dropdown-item" @click="closeDropdown">
              Pengajuan Online
              <span v-if="pendingLoan > 0" class="badge-count">{{ pendingLoan }}</span>
            </RouterLink>
          </div>
        </Transition>
      </div>

      <!-- Dropdown: Kelola -->
      <div class="nav-group">
        <button
          class="nav-link nav-dropdown-trigger"
          :class="{ 'nav-link--active': activeDropdown === 'kelola' }"
          @click.stop="toggleDropdown('kelola')"
        >Kelola <span class="dropdown-caret" :class="{ open: activeDropdown === 'kelola' }">▾</span></button>
        <Transition name="dd">
          <div class="nav-dropdown" v-if="activeDropdown === 'kelola'">
            <RouterLink to="/admin/kategori" class="dropdown-item" @click="closeDropdown">Kelola Kategori</RouterLink>
            <template v-if="isSuperadmin">
              <div class="dropdown-divider"></div>
              <RouterLink to="/admin/delete-requests" class="dropdown-item dropdown-item--danger" @click="closeDropdown">
                Pengajuan Hapus
                <span v-if="pendingDelete > 0" class="badge-count badge-count--danger">{{ pendingDelete }}</span>
              </RouterLink>
              <RouterLink to="/admin/panel" class="dropdown-item" @click="closeDropdown">Panel Admin</RouterLink>
            </template>
          </div>
        </Transition>
      </div>

      <RouterLink to="/admin/logs" class="nav-link" active-class="nav-link--active">Log</RouterLink>
    </div>

    <!-- Right Section: Theme + User -->
    <div class="nav-right">
      <!-- Theme Toggle -->
      <button class="theme-toggle" @click="toggleTheme" :title="isDark ? 'Mode terang' : 'Mode gelap'" aria-label="Toggle tema">
        <span v-if="isDark">☀️</span>
        <span v-else>🌙</span>
      </button>

      <!-- User Info (desktop) -->
      <div class="nav-user" v-if="isLoggedIn">
        <RouterLink to="/admin/profile" class="user-name">{{ currentAdmin?.nickname || currentAdmin?.nama }}</RouterLink>
        <span v-if="isSuperadmin" class="badge-super" title="Superadmin">SA</span>
        <button class="btn-logout" @click="handleLogout">Keluar</button>
      </div>

      <!-- Hamburger (mobile) -->
      <button class="hamburger" @click="toggleDrawer" :aria-expanded="drawerOpen" aria-label="Buka menu">
        <span :class="{ open: drawerOpen }"></span>
        <span :class="{ open: drawerOpen }"></span>
        <span :class="{ open: drawerOpen }"></span>
      </button>
    </div>

    <!-- Mobile Drawer Overlay -->
    <Transition name="drawer-overlay">
      <div v-if="drawerOpen" class="drawer-overlay" @click="closeDrawer"></div>
    </Transition>

    <!-- Mobile Drawer -->
    <Transition name="drawer">
      <div v-if="drawerOpen" class="drawer" role="dialog" aria-label="Menu navigasi mobile">
        <div class="drawer-header">
          <span class="drawer-brand">PUSTAKA FILSAFAT</span>
          <button class="drawer-close" @click="closeDrawer" aria-label="Tutup menu">✕</button>
        </div>

        <nav class="drawer-nav">
          <RouterLink to="/admin" class="drawer-link" @click="closeDrawer">🏠 Dashboard</RouterLink>

          <div class="drawer-section-title">BUKU</div>
          <RouterLink to="/admin/books"         class="drawer-link" @click="closeDrawer">📚 Daftar Buku</RouterLink>
          <RouterLink to="/admin/books/add"     class="drawer-link" @click="closeDrawer">➕ Tambah Buku</RouterLink>
          <RouterLink to="/admin/update-posisi" class="drawer-link" @click="closeDrawer">📍 Update Posisi Buku</RouterLink>

          <div class="drawer-section-title">PEMINJAMAN</div>
          <RouterLink to="/admin/loans"         class="drawer-link" @click="closeDrawer">📋 Catat Pinjam/Kembali</RouterLink>
          <RouterLink to="/admin/loan-requests" class="drawer-link" @click="closeDrawer">
            📥 Pengajuan Online
            <span v-if="pendingLoan > 0" class="badge-count">{{ pendingLoan }}</span>
          </RouterLink>

          <div class="drawer-section-title">KELOLA</div>
          <RouterLink to="/admin/kategori" class="drawer-link" @click="closeDrawer">🗂 Kelola Kategori</RouterLink>

          <template v-if="isSuperadmin">
            <div class="drawer-section-title">SUPERADMIN</div>
            <RouterLink to="/admin/delete-requests" class="drawer-link drawer-link--danger" @click="closeDrawer">
              🗑 Pengajuan Hapus
              <span v-if="pendingDelete > 0" class="badge-count badge-count--danger">{{ pendingDelete }}</span>
            </RouterLink>
            <RouterLink to="/admin/panel" class="drawer-link" @click="closeDrawer">👥 Panel Admin</RouterLink>
          </template>

          <div class="drawer-section-title">LAINNYA</div>
          <RouterLink to="/admin/logs"    class="drawer-link" @click="closeDrawer">📜 Log Aktivitas</RouterLink>
          <RouterLink to="/admin/profile" class="drawer-link" @click="closeDrawer">👤 Profil Saya</RouterLink>
        </nav>

        <div class="drawer-footer">
          <div class="drawer-user" v-if="isLoggedIn">
            <span class="drawer-user-name">{{ currentAdmin?.nama }}</span>
            <span v-if="isSuperadmin" class="badge-super">SA</span>
          </div>
          <button class="drawer-logout" @click="handleLogout">Keluar</button>
        </div>
      </div>
    </Transition>
  </nav>
</template>

<style scoped>
/* ── DESKTOP NAV ───────────────────────────────────────── */
.nav-links {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
  padding: 0 1.5rem;
}

.nav-link {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--nav-text);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.375rem 0.625rem;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
  white-space: nowrap;
}

.nav-link:hover,
.nav-link--active,
.router-link-active.nav-link { color: var(--nav-text-active); }

/* Dropdown group */
.nav-group {
  position: relative;
}

.nav-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.dropdown-caret {
  font-size: 0.65rem;
  opacity: 0.7;
  transition: transform 0.15s;
}

.nav-group:has(.nav-link--active) .dropdown-caret { transform: rotate(180deg); }
.dropdown-caret.open { transform: rotate(180deg); }

.nav-dropdown {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  min-width: 200px;
  box-shadow: var(--shadow-lg);
  z-index: 300;
}

/* Dropdown transition */
.dd-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.dd-leave-active { transition: opacity 0.1s ease; }
.dd-enter-from   { opacity: 0; transform: translateY(-6px); }
.dd-leave-to     { opacity: 0; }

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  color: var(--text-primary);
  transition: background 0.1s;
}

.dropdown-item:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.dropdown-item--danger { color: var(--danger); }
.dropdown-item--danger:hover { background: var(--danger-bg); }

.dropdown-divider {
  height: 1px;
  background: var(--border);
  margin: 0.375rem 0;
}

/* ── RIGHT SECTION ─────────────────────────────────────── */
.nav-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

/* Theme Toggle */
.theme-toggle {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.375rem;
  line-height: 1;
  border-radius: 4px;
  transition: background 0.15s;
}
.theme-toggle:hover { background: rgba(255,255,255,0.1); }

/* User info */
.nav-user {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-name {
  font-size: 0.8rem;
  color: var(--nav-text);
  font-weight: 500;
}

.user-name:hover { color: var(--nav-text-active); }

.badge-super {
  background: var(--nav-text-active);
  color: var(--nav-bg);
  font-size: 0.6rem;
  padding: 2px 5px;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.btn-logout {
  background: transparent;
  border: 1px solid var(--nav-border);
  color: var(--nav-text);
  padding: 0.3rem 0.625rem;
  font-size: 0.75rem;
  font-family: var(--font-heading);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-logout:hover { border-color: var(--nav-text-active); color: var(--nav-text-active); }

/* Badge count */
.badge-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: var(--accent);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  border-radius: 99px;
}
.badge-count--danger { background: var(--danger); }

/* ── HAMBURGER ─────────────────────────────────────────── */
.hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 36px;
  height: 36px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.375rem;
}

.hamburger span {
  display: block;
  height: 2px;
  width: 100%;
  background: var(--nav-text-active);
  transition: all 0.25s ease;
  transform-origin: center;
}

.hamburger span.open:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
.hamburger span.open:nth-child(2) { opacity: 0; }
.hamburger span.open:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }

/* ── MOBILE DRAWER ─────────────────────────────────────── */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 400;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: min(320px, 85vw);
  height: 100vh;
  background: var(--bg-surface);
  border-left: 1px solid var(--border);
  z-index: 500;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.25rem;
  border-bottom: 1px solid var(--border);
  background: var(--nav-bg);
}

.drawer-brand {
  font-family: var(--font-heading);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--nav-text-active);
  letter-spacing: 0.06em;
}

.drawer-close {
  background: none;
  border: none;
  color: var(--nav-text-active);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
}

.drawer-nav {
  flex: 1;
  padding: 0.75rem 0;
  overflow-y: auto;
}

.drawer-section-title {
  padding: 0.75rem 1.25rem 0.25rem;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  text-transform: uppercase;
}

.drawer-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  transition: background 0.1s;
}
.drawer-link:hover, .router-link-active.drawer-link {
  background: var(--bg-elevated);
  color: var(--text-primary);
}
.drawer-link--danger { color: var(--danger); }

.drawer-footer {
  padding: 1.25rem;
  border-top: 1px solid var(--border);
}

.drawer-user {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.drawer-user-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.drawer-logout {
  width: 100%;
  padding: 0.75rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-primary);
  font-family: var(--font-heading);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}
.drawer-logout:hover { border-color: var(--border-strong); }

/* ── TRANSITIONS ───────────────────────────────────────── */
.drawer-enter-active, .drawer-leave-active { transition: transform 0.25s ease; }
.drawer-enter-from, .drawer-leave-to       { transform: translateX(100%); }

.drawer-overlay-enter-active, .drawer-overlay-leave-active { transition: opacity 0.25s ease; }
.drawer-overlay-enter-from, .drawer-overlay-leave-to       { opacity: 0; }

/* ── RESPONSIVE ────────────────────────────────────────── */
@media (max-width: 900px) {
  .nav-links { display: none; }
  .nav-user  { display: none; }
  .hamburger { display: flex; }
}

@media (min-width: 901px) {
  .drawer-overlay { display: none; }
  .drawer         { display: none; }
  .hamburger      { display: none; }
}
</style>
