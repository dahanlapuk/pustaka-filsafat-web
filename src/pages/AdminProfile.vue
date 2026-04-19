<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAdmin } from '../stores/admin'

const router = useRouter()
const { currentAdmin, loading, updateProfile, changePassword, passwordExpired } = useAdmin()

// Profile form
const profileForm = ref({
  nama: '',
  nickname: '',
  email: ''
})

// Password form
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const showPasswordSection = ref(false)
const profileMessage = ref({ type: '', text: '' })
const passwordMessage = ref({ type: '', text: '' })

// Password expiry warning
const passwordExpiryWarning = computed(() => {
  if (!currentAdmin.value?.password_changed_at) return null
  const changedAt = new Date(currentAdmin.value.password_changed_at)
  const sixMonthsLater = new Date(changedAt.getTime() + 6 * 30 * 24 * 60 * 60 * 1000)
  const daysLeft = Math.ceil((sixMonthsLater - new Date()) / (24 * 60 * 60 * 1000))
  if (daysLeft <= 30 && daysLeft > 0) {
    return `Password akan kadaluarsa dalam ${daysLeft} hari`
  }
  if (daysLeft <= 0) {
    return 'Password sudah kadaluarsa! Silakan ganti password Anda.'
  }
  return null
})

onMounted(() => {
  if (currentAdmin.value) {
    profileForm.value = {
      nama: currentAdmin.value.nama || '',
      nickname: currentAdmin.value.nickname || '',
      email: currentAdmin.value.email || ''
    }
  }
  // Auto show password section if expired
  if (passwordExpired.value) {
    showPasswordSection.value = true
  }
})

async function handleProfileUpdate() {
  profileMessage.value = { type: '', text: '' }
  
  if (!profileForm.value.nama.trim()) {
    profileMessage.value = { type: 'error', text: 'Nama tidak boleh kosong' }
    return
  }

  const result = await updateProfile(profileForm.value)
  if (result.success) {
    profileMessage.value = { type: 'success', text: 'Profil berhasil diperbarui' }
  } else {
    profileMessage.value = { type: 'error', text: result.error }
  }
}

async function handlePasswordChange() {
  passwordMessage.value = { type: '', text: '' }

  if (!passwordForm.value.oldPassword) {
    passwordMessage.value = { type: 'error', text: 'Password lama harus diisi' }
    return
  }
  if (!passwordForm.value.newPassword) {
    passwordMessage.value = { type: 'error', text: 'Password baru harus diisi' }
    return
  }
  if (passwordForm.value.newPassword.length < 6) {
    passwordMessage.value = { type: 'error', text: 'Password baru minimal 6 karakter' }
    return
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordMessage.value = { type: 'error', text: 'Konfirmasi password tidak cocok' }
    return
  }

  const result = await changePassword(passwordForm.value.oldPassword, passwordForm.value.newPassword)
  if (result.success) {
    passwordMessage.value = { type: 'success', text: 'Password berhasil diubah' }
    passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } else {
    passwordMessage.value = { type: 'error', text: result.error }
  }
}
</script>

<template>
  <div class="profile-page">
    <div class="page-header">
      <h1>Profil Admin</h1>
      <p>Kelola informasi akun dan keamanan Anda</p>
    </div>

    <!-- Password Expiry Warning -->
    <div v-if="passwordExpiryWarning" class="alert alert-warning">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      {{ passwordExpiryWarning }}
    </div>

    <div class="profile-grid">
      <!-- Profile Section -->
      <section class="profile-section">
        <h2>Informasi Profil</h2>
        
        <div v-if="profileMessage.text" :class="['alert', `alert-${profileMessage.type}`]">
          {{ profileMessage.text }}
        </div>

        <form @submit.prevent="handleProfileUpdate" class="profile-form">
          <div class="form-group">
            <label for="nama">Nama Lengkap</label>
            <input 
              type="text" 
              id="nama" 
              v-model="profileForm.nama" 
              class="form-input"
              placeholder="Nama lengkap Anda"
            />
          </div>

          <div class="form-group">
            <label for="nickname">Panggilan</label>
            <input 
              type="text" 
              id="nickname" 
              v-model="profileForm.nickname" 
              class="form-input"
              placeholder="Nama panggilan untuk sapaan"
            />
            <small class="form-hint">Digunakan untuk sapaan di dashboard</small>
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email" 
              v-model="profileForm.email" 
              class="form-input"
              placeholder="email@example.com"
            />
          </div>

          <div class="form-group">
            <label>Role</label>
            <input 
              type="text" 
              :value="currentAdmin?.role || '-'" 
              class="form-input" 
              disabled 
            />
            <small class="form-hint">Role tidak dapat diubah</small>
          </div>

          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Menyimpan...' : 'Simpan Perubahan' }}
          </button>
        </form>
      </section>

      <!-- Password Section -->
      <section class="profile-section">
        <div class="section-header">
          <h2>Keamanan</h2>
          <button 
            @click="showPasswordSection = !showPasswordSection" 
            class="btn btn-outline btn-sm"
          >
            {{ showPasswordSection ? 'Tutup' : 'Ubah Password' }}
          </button>
        </div>

        <div v-if="showPasswordSection" class="password-section">
          <div v-if="passwordMessage.text" :class="['alert', `alert-${passwordMessage.type}`]">
            {{ passwordMessage.text }}
          </div>

          <form @submit.prevent="handlePasswordChange" class="profile-form">
            <div class="form-group">
              <label for="oldPassword">Password Lama</label>
              <input 
                type="password" 
                id="oldPassword" 
                v-model="passwordForm.oldPassword" 
                class="form-input"
                placeholder="Masukkan password lama"
              />
            </div>

            <div class="form-group">
              <label for="newPassword">Password Baru</label>
              <input 
                type="password" 
                id="newPassword" 
                v-model="passwordForm.newPassword" 
                class="form-input"
                placeholder="Minimal 6 karakter"
              />
            </div>

            <div class="form-group">
              <label for="confirmPassword">Konfirmasi Password Baru</label>
              <input 
                type="password" 
                id="confirmPassword" 
                v-model="passwordForm.confirmPassword" 
                class="form-input"
                placeholder="Ketik ulang password baru"
              />
            </div>

            <button type="submit" class="btn btn-primary" :disabled="loading">
              {{ loading ? 'Mengubah...' : 'Ubah Password' }}
            </button>
          </form>

          <div class="password-info">
            <h4>Ketentuan Password:</h4>
            <ul>
              <li>Minimal 6 karakter</li>
              <li>Password berlaku selama 6 bulan</li>
              <li>Setelah 6 bulan, Anda akan diminta mengganti password</li>
            </ul>
          </div>
        </div>

        <div v-else class="security-info">
          <p>Password terakhir diubah: 
            <strong>{{ currentAdmin?.password_changed_at ? new Date(currentAdmin.password_changed_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Tidak diketahui' }}</strong>
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  padding: var(--space-6);
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--space-6);
}

.page-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: var(--space-2);
}

.page-header p {
  color: var(--text-secondary);
}

.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);
}

@media (max-width: 768px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
}

.profile-section {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-5);
}

.profile-section h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border);
}

.section-header h2 {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-input {
  padding: var(--space-3);
  border: 1px solid var(--border-medium);
  background: var(--bg-surface);
  color: var(--text-primary);
  border-radius: var(--radius);
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--border-strong);
}

.form-input:disabled {
  background: var(--bg-elevated);
  color: var(--text-muted);
  cursor: not-allowed;
}

.form-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.btn {
  padding: var(--space-3) var(--space-4);
  border: none;
  border-radius: var(--radius);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--accent);
  color: var(--text-inverse);
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-medium);
  color: var(--text-primary);
}

.btn-outline:hover {
  background: var(--bg-elevated);
}

.btn-sm {
  padding: var(--space-2) var(--space-3);
  font-size: 0.75rem;
}

.alert {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius);
  font-size: 0.875rem;
  margin-bottom: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.alert-success {
  background: var(--success-bg);
  color: var(--success);
  border: 1px solid var(--success);
}

.alert-error {
  background: var(--danger-bg);
  color: var(--danger);
  border: 1px solid var(--danger);
}

.alert-warning {
  background: var(--warning-bg);
  color: var(--warning);
  border: 1px solid var(--warning);
}

.password-section {
  margin-top: var(--space-4);
}

.password-info {
  margin-top: var(--space-5);
  padding: var(--space-4);
  background: var(--bg-elevated);
  border-radius: var(--radius);
}

.password-info h4 {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: var(--space-2);
}

.password-info ul {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
  padding-left: var(--space-4);
}

.password-info li {
  margin-bottom: var(--space-1);
}

.security-info {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.security-info strong {
  color: var(--text-primary);
}
</style>
