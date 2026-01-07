<!--
  CreateMarketView.vue - Form untuk membuat market baru
  
  Fitur:
  - Form input nama, deskripsi, logo
  - Validasi max 2 market per user
  - Success redirect ke Your Market
-->

<template>
  <div class="create-market-layout">
    <div class="form-container">
      <!-- Header -->
      <div class="form-header">
        <router-link to="/market/my" class="back-link">← Kembali</router-link>
        <h1>➕ Buat Market Baru</h1>
        <p class="subtitle">Buat marketmu sendiri dan mulai kelola kandang</p>
      </div>

      <!-- Limit Warning -->
      <div v-if="!canCreate && !loading" class="limit-warning">
        <span class="warning-icon">⚠️</span>
        <div>
          <strong>Batas tercapai!</strong>
          <p>Kamu sudah punya 2 market. Hapus salah satu untuk membuat market baru.</p>
        </div>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="handleSubmit" class="market-form">
        <!-- Nama Market -->
        <div class="form-group">
          <label for="name">Nama Market *</label>
          <input 
            type="text" 
            id="name" 
            v-model="form.name" 
            placeholder="Contoh: Farm Berkah Jaya"
            required
            :disabled="loading"
            @input="onNameInput"
          />
        </div>

        <!-- Handle Market -->
        <div class="form-group">
          <label for="handle">Handle / Username *</label>
          <div class="input-prefix-group">
            <span class="prefix">@</span>
            <input 
              type="text" 
              id="handle" 
              v-model="form.handle" 
              placeholder="nama_market"
              required
              :disabled="loading"
              @input="checkHandle"
              class="handle-input"
            />
          </div>
          <p class="field-hint" :class="{ 'status-ok': handleStatus.valid && form.handle, 'status-error': !handleStatus.valid && form.handle && !handleStatus.checking }">
            {{ handleStatus.message || 'URL: peternakantelur.com/market/@' + (form.handle || 'nama_market') }}
          </p>
        </div>

        <!-- Deskripsi -->
        <div class="form-group">
          <label for="description">Deskripsi</label>
          <textarea 
            id="description" 
            v-model="form.description" 
            placeholder="Jelaskan tentang market kamu..."
            rows="3"
            :disabled="loading"
          ></textarea>
        </div>

        <!-- Logo URL -->
        <div class="form-group">
          <label for="logo">URL Logo (opsional)</label>
          <input 
            type="url" 
            id="logo" 
            v-model="form.logo" 
            placeholder="https://example.com/logo.png"
            :disabled="loading"
          />
          <p class="field-hint">Masukkan URL gambar untuk logo market</p>
        </div>

        <!-- Preview -->
        <div v-if="form.name" class="preview-section">
          <label>Preview</label>
          <div class="preview-card">
            <div class="preview-logo">
              <img v-if="form.logo" :src="form.logo" alt="Logo" @error="form.logo = ''" />
              <span v-else class="logo-placeholder">{{ form.name.charAt(0) }}</span>
            </div>
            <div class="preview-info">
              <h3>{{ form.name }}</h3>
              <p>{{ form.description || 'Tidak ada deskripsi' }}</p>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <!-- Submit Button -->
        <button type="submit" class="btn-submit" :disabled="loading || !form.name || !isHandleValid">
          <span v-if="loading" class="spinner-small"></span>
          {{ loading ? 'Membuat...' : '🚀 Buat Market' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMarketStore } from '../stores/market'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const marketStore = useMarketStore()
const authStore = useAuthStore()

const form = ref({
  name: '',
  handle: '',
  description: '',
  logo: ''
})

const handleStatus = ref({ valid: true, checking: false, message: '' })
let debounceTimer = null

const loading = computed(() => marketStore.loading)
const error = computed(() => marketStore.error)
const canCreate = computed(() => marketStore.canCreateMarket)
const isHandleValid = computed(() => form.value.handle && handleStatus.value.valid && !handleStatus.value.checking)

onMounted(async () => {
  authStore.loadUser()
  if (authStore.user?._id) {
    await marketStore.checkMarketCount(authStore.user._id)
  }
})

// Auto-generate handle dari nama jika handle masih kosong
function onNameInput() {
  if (!form.value.handle && form.value.name) {
    const suggested = form.value.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 15)
    
    form.value.handle = suggested
    checkHandle()
  }
}

// Validasi handle
async function checkHandle() {
  const handle = form.value.handle
  
  // Basic validation
  if (!handle) {
    handleStatus.value = { valid: false, checking: false, message: '' }
    return
  }
  
  if (handle.length < 3) {
    handleStatus.value = { valid: false, checking: false, message: 'Minimal 3 karakter' }
    return
  }
  
  if (!/^[a-z0-9_]+$/.test(handle)) {
    handleStatus.value = { valid: false, checking: false, message: 'Hanya huruf kecil, angka, dan underscore' }
    return
  }

  // Check availability with debounce
  handleStatus.value = { valid: false, checking: true, message: 'Mengecek...' }
  
  if (debounceTimer) clearTimeout(debounceTimer)
  
  debounceTimer = setTimeout(async () => {
    try {
      const res = await marketStore.checkHandleAvailable(handle)
      handleStatus.value = { 
        valid: res.available, 
        checking: false, 
        message: res.message 
      }
    } catch (e) {
      handleStatus.value = { valid: false, checking: false, message: 'Gagal mengecek handle' }
    }
  }, 500)
}

async function handleSubmit() {
  if (!form.value.name || !isHandleValid.value || !authStore.user?._id) return

  try {
    await marketStore.createMarket({
      name: form.value.name,
      handle: form.value.handle,
      description: form.value.description || undefined,
      logo: form.value.logo || undefined,
      userId: authStore.user._id
    })
    
    // Redirect ke Your Market
    router.push('/market/my')
  } catch (e) {
    console.error('Error creating market:', e)
  }
}
</script>

<style scoped>
.create-market-layout {
  min-height: 100vh;
  background: linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 50%, #F0FDFA 100%);
  padding: 24px;
  padding-left: 304px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

@media (max-width: 768px) {
  .create-market-layout {
    padding-left: 24px;
    padding-top: 80px;
  }
}

.form-container {
  width: 100%;
  max-width: 520px;
  background: white;
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
}

.form-header {
  text-align: center;
  margin-bottom: 32px;
}

.back-link {
  display: inline-block;
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
  margin-bottom: 16px;
  transition: transform 0.2s;
}

.back-link:hover {
  transform: translateX(-4px);
}

.form-header h1 {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.limit-warning {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #FEF3C7;
  border: 1px solid #F59E0B;
  border-radius: 12px;
  margin-bottom: 24px;
}

.warning-icon {
  font-size: 1.5rem;
}

.limit-warning strong {
  color: #92400E;
}

.limit-warning p {
  color: #A16207;
  font-size: 0.875rem;
  margin-top: 4px;
}

.market-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.form-group input,
.form-group textarea {
  padding: 12px 16px;
  border: 2px solid #E2E8F0;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.2s;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
}

.form-group input:disabled,
.form-group textarea:disabled {
  background: #F8FAFC;
  cursor: not-allowed;
}

.field-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.preview-section {
  margin-top: 8px;
}

.preview-section label {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
  display: block;
  margin-bottom: 8px;
}

.preview-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #F8FAFC;
  border-radius: 12px;
  border: 1px dashed #CBD5E1;
}

.preview-logo {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}

.preview-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary), #10B981);
  color: white;
  font-size: 1.25rem;
  font-weight: 700;
}

.preview-info h3 {
  font-size: 1rem;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.preview-info p {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.error-message {
  padding: 12px 16px;
  background: #FEE2E2;
  color: #DC2626;
  border-radius: 10px;
  font-size: 0.9rem;
}

.btn-submit {
  padding: 14px 24px;
  background: linear-gradient(135deg, var(--primary), #10B981);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(5, 150, 105, 0.3);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner-small {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.input-prefix-group {
  display: flex;
  align-items: center;
  border: 2px solid #E2E8F0;
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.2s;
}

.input-prefix-group:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
}

.prefix {
  padding: 0 16px;
  background: #F8FAFC;
  color: #64748B;
  font-weight: 600;
  border-right: 1px solid #E2E8F0;
  height: 48px; /* Match input height roughly */
  display: flex;
  align-items: center;
}

.handle-input {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.status-ok {
  color: #10B981;
}

.status-error {
  color: #DC2626;
}
</style>
