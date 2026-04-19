<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAdmin } from '../stores/admin'

const router = useRouter()
const route = useRoute()
const { adminList, loading, isLoggedIn, fetchAdmins, login } = useAdmin()

const selectedAdminId = ref(null)
const password = ref('')
const error = ref('')
const showPassword = ref(false)

// Check if session expired
const sessionExpired = computed(() => route.query.expired === 'true')
const redirectPath = computed(() => route.query.redirect || '/admin')

onMounted(async () => {
  // If already logged in, redirect to dashboard
  if (isLoggedIn.value) {
    router.push(redirectPath.value)
    return
  }
  await fetchAdmins()
})

async function handleLogin() {
  if (!selectedAdminId.value) {
    error.value = 'Pilih admin terlebih dahulu'
    return
  }
  if (!password.value) {
    error.value = 'Password harus diisi'
    return
  }
  
  error.value = ''
  const result = await login(selectedAdminId.value, password.value)
  if (result.success) {
    router.push(redirectPath.value)
  } else {
    error.value = result.error
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <h1>PUSTAKA FILSAFAT</h1>
        <p>Sistem Perpustakaan Prodi Filsafat FIB UI</p>
      </div>

      <div class="login-card">
        <h2>Masuk sebagai Admin</h2>
        
        <div v-if="sessionExpired" class="alert alert-warning">
          Sesi Anda telah berakhir. Silakan login kembali.
        </div>
        
        <div v-if="error" class="alert alert-error">
          {{ error }}
        </div>

        <div v-if="loading && adminList.length === 0" class="loading">
          <p>Memuat...</p>
        </div>

        <form v-else @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label class="form-label">Pilih Admin:</label>
            <div class="admin-list">
              <label 
                v-for="admin in adminList" 
                :key="admin.id" 
                class="admin-option"
                :class="{ selected: selectedAdminId === admin.id }"
              >
                <input 
                  type="radio" 
                  :value="admin.id" 
                  v-model="selectedAdminId"
                  class="radio-input"
                />
                <div class="admin-info">
                  <span class="admin-name">{{ admin.nama }}</span>
                  <span class="admin-title">{{ admin.title }}</span>
                  <span v-if="admin.is_superadmin" class="badge badge-super">Superadmin</span>
                </div>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label for="password" class="form-label">Password:</label>
            <div class="password-input-wrapper">
              <input 
                :type="showPassword ? 'text' : 'password'"
                id="password"
                v-model="password"
                class="form-input"
                placeholder="Masukkan password"
                autocomplete="current-password"
              />
              <button 
                type="button" 
                @click="showPassword = !showPassword"
                class="password-toggle"
              >
                <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
          </div>

          <button 
            type="submit"
            class="btn btn-primary btn-block"
            :disabled="!selectedAdminId || !password || loading"
          >
            {{ loading ? 'Memproses...' : 'Masuk' }}
          </button>
        </form>
      </div>

      <div class="login-footer">
        <RouterLink to="/" class="link">← Kembali ke Katalog Publik</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--gray-100);
  padding: var(--space-5);
}

.login-container {
  width: 100%;
  max-width: 480px;
}

.login-header {
  text-align: center;
  margin-bottom: var(--space-6);
}

.login-header h1 {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.05em;
  margin-bottom: var(--space-2);
}

.login-header p {
  color: var(--gray-600);
}

.login-card {
  background: var(--white);
  border: 2px solid var(--black);
  padding: var(--space-6);
}

.login-card h2 {
  font-size: 1.25rem;
  margin-bottom: var(--space-5);
  text-align: center;
}

.admin-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.admin-option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 2px solid var(--gray-200);
  cursor: pointer;
  transition: all 0.2s;
}

.admin-option:hover {
  border-color: var(--gray-400);
}

.admin-option.selected {
  border-color: var(--black);
  background: var(--gray-50);
}

.radio-input {
  width: 20px;
  height: 20px;
  accent-color: var(--black);
}

.admin-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
}

.admin-name {
  font-weight: 600;
  color: var(--text-primary);
}

.admin-title {
  font-size: 0.875rem;
  color: var(--gray-600);
}

.badge-super {
  display: inline-block;
  font-size: 0.75rem;
  background: var(--black);
  color: var(--white);
  padding: 2px 8px;
  font-weight: 500;
  width: fit-content;
}

.btn-block {
  width: 100%;
  padding: var(--space-4);
  font-size: 1rem;
}

.login-footer {
  text-align: center;
  margin-top: var(--space-5);
}

.link {
  color: var(--gray-600);
  font-size: 0.875rem;
}

.link:hover {
  color: var(--text-primary);
}

.alert {
  padding: var(--space-3);
  margin-bottom: var(--space-4);
}

.alert-error {
  background: #fee;
  border: 1px solid #fcc;
  color: #c00;
}

.alert-warning {
  background: #fff3cd;
  border: 1px solid #ffc107;
  color: #856404;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 2px solid var(--gray-200);
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--black);
}

.password-input-wrapper {
  position: relative;
}

.password-input-wrapper .form-input {
  padding-right: 48px;
}

.password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--gray-500);
  padding: 4px;
}

.password-toggle:hover {
  color: var(--text-primary);
}
</style>
