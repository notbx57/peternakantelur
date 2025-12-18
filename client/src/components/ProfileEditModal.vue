<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Edit Profil</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <form @submit.prevent="saveProfile" class="modal-form">
        <!-- Avatar Upload Section -->
        <div class="avatar-section">
          <div 
            class="avatar-preview" 
            :style="avatarPreviewStyle"
            @click="triggerFileInput"
          >
            <span v-if="!avatarPreviewUrl">{{ formData.name?.charAt(0) || '?' }}</span>
          </div>
          
          <input 
            type="file" 
            ref="fileInput"
            accept="image/*"
            @change="handleFileSelect"
            class="hidden-input"
          />
          
          <!-- File selected but not yet uploaded - show confirmation buttons -->
          <div v-if="pendingFile" class="avatar-confirm-actions">
            <button type="button" class="btn btn-confirm-upload" @click="confirmUpload" :disabled="uploading">
              {{ uploading ? 'Mengupload...' : '✓ Upload' }}
            </button>
            <button type="button" class="btn btn-confirm-cancel" @click="cancelUpload" :disabled="uploading">
              ✗ Batal
            </button>
          </div>
          
          <!-- No pending file - show select button -->
          <button v-else type="button" class="upload-btn" @click="triggerFileInput" :disabled="uploading">
            {{ uploading ? 'Mengupload...' : '📷 Pilih Foto' }}
          </button>
          
          <div v-if="uploadProgress > 0 && uploadProgress < 100" class="upload-progress">
            <div class="progress-bar" :style="{ width: uploadProgress + '%' }"></div>
          </div>
          
          <small class="hint">{{ pendingFile ? 'Konfirmasi untuk mengupload foto' : 'Klik avatar atau tombol untuk pilih foto' }}</small>
        </div>

        <!-- Name -->
        <div class="form-group">
          <label class="form-label">Nama</label>
          <input 
            type="text" 
            v-model="formData.name" 
            class="input" 
            placeholder="Masukkan nama"
            required
          />
        </div>

        <!-- Phone Number -->
        <div class="form-group">
          <label class="form-label">Nomor HP</label>
          <input 
            type="tel" 
            v-model="formData.phoneNumber" 
            class="input" 
            placeholder="Contoh: 081234567890"
          />
        </div>

        <!-- Role (Read Only) -->
        <div class="form-group">
          <label class="form-label">Role</label>
          <div class="role-badge">
            <span :class="['badge', user?.role]">
              {{ formatRole(user?.role) }}
            </span>
            <small class="hint">Role tidak dapat diubah</small>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            Batal
          </button>
          <button type="submit" class="btn btn-primary" :disabled="saving || uploading">
            {{ saving ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </form>
    </div>


    <!-- Toast Notification -->
    <div v-if="showToast" class="toast success">
      <span class="toast-icon">✓</span>
      <span>Profil berhasil diperbaharui</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const emit = defineEmits(['close', 'saved'])
const authStore = useAuthStore()

const user = authStore.user
const saving = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const fileInput = ref(null)

const avatarPreviewUrl = ref(user?.avatar || '')
const pendingFile = ref(null) // File yang dipilih tapi belum diupload
const originalAvatarUrl = user?.avatar || '' // Untuk reset jika batal
const showToast = ref(false)

const formData = reactive({
  name: user?.name || '',
  avatar: user?.avatar || '',
  phoneNumber: user?.phoneNumber || ''
})

const avatarPreviewStyle = computed(() => {
  if (avatarPreviewUrl.value) {
    return {
      backgroundImage: `url(${avatarPreviewUrl.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }
  }
  return {}
})

function triggerFileInput() {
  fileInput.value?.click()
}

async function handleFileSelect(event) {
  const file = event.target.files?.[0]
  if (!file) return

  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Pilih file gambar (JPG, PNG, dll)')
    return
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('Ukuran file maksimal 5MB')
    return
  }

  // Store pending file for confirmation
  pendingFile.value = file

  // Show preview immediately (but don't upload yet)
  const reader = new FileReader()
  reader.onload = (e) => {
    avatarPreviewUrl.value = e.target?.result
  }
  reader.readAsDataURL(file)
}

// Confirm and actually upload the file
async function confirmUpload() {
  if (!pendingFile.value) return
  await uploadAvatar(pendingFile.value)
  pendingFile.value = null
}

// Cancel file selection and restore original avatar
function cancelUpload() {
  pendingFile.value = null
  avatarPreviewUrl.value = originalAvatarUrl
  if (fileInput.value) {
    fileInput.value.value = '' // Reset file input
  }
}

async function uploadAvatar(file) {
  if (!user?._id) return

  uploading.value = true
  uploadProgress.value = 10

  try {
    // 1. Get upload URL from backend
    const urlResponse = await fetch('http://localhost:3001/api/users/avatar/upload-url', {
      method: 'POST'
    })
    
    if (!urlResponse.ok) {
      throw new Error('Gagal mendapatkan upload URL')
    }
    
    const { uploadUrl } = await urlResponse.json()
    uploadProgress.value = 30

    // 2. Upload file to Convex storage
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file
    })

    if (!uploadResponse.ok) {
      throw new Error('Gagal upload file')
    }

    const { storageId } = await uploadResponse.json()
    uploadProgress.value = 70

    // 3. Update user avatar with storageId
    const updateResponse = await fetch('http://localhost:3001/api/users/avatar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user._id,
        storageId
      })
    })

    if (!updateResponse.ok) {
      throw new Error('Gagal update avatar')
    }

    const updatedUser = await updateResponse.json()
    uploadProgress.value = 100
    
    // Update form data with new avatar URL
    formData.avatar = updatedUser.avatar
    avatarPreviewUrl.value = updatedUser.avatar

    // Update auth store
    authStore.setUser({
      ...user,
      avatar: updatedUser.avatar
    })

  } catch (error) {
    console.error('Upload error:', error)
    alert('Gagal upload avatar: ' + error.message)
    avatarPreviewUrl.value = user?.avatar || ''
  } finally {
    uploading.value = false
    setTimeout(() => {
      uploadProgress.value = 0
    }, 500)
  }
}

async function saveProfile() {
  if (!user?._id) return
  
  saving.value = true
  try {
    const response = await fetch('http://localhost:3001/api/users/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user._id,
        name: formData.name,
        avatar: formData.avatar || undefined,
        phoneNumber: formData.phoneNumber || undefined
      })
    })

    if (response.ok) {
      authStore.setUser({
        ...user,
        name: formData.name,
        avatar: formData.avatar,
        phoneNumber: formData.phoneNumber
      })
      
      // Show toast
      showToast.value = true
      
      // Close modal after delay
      setTimeout(() => {
        showToast.value = false
        emit('saved')
        emit('close')
      }, 1500)
    } else {
      alert('Gagal menyimpan profil')
    }
  } catch (e) {
    console.error('Error saving profile:', e)
    alert('Error menyimpan profil')
  } finally {
    saving.value = false
  }
}

function formatRole(role) {
  const roles = {
    head_owner: 'Head Owner',
    co_owner: 'Co Owner',
    investor: 'Investor'
  }
  return roles[role] || role
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #E2E8F0;
}

.modal-header h2 {
  font-size: 1.25rem;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.close-btn:hover {
  color: var(--danger);
}

.modal-form {
  padding: 20px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.avatar-preview {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 4px solid #E2E8F0;
}

.avatar-preview:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.hidden-input {
  display: none;
}

.upload-btn {
  padding: 10px 20px;
  background: #F1F5F9;
  border: 1px dashed #CBD5E1;
  border-radius: 8px;
  font-size: 0.875rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.upload-btn:hover:not(:disabled) {
  background: #E2E8F0;
  border-color: var(--primary);
}

.upload-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Avatar confirmation buttons */
.avatar-confirm-actions {
  display: flex;
  gap: 10px;
}

.btn-confirm-upload {
  padding: 10px 20px;
  background: #10B981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-confirm-upload:hover:not(:disabled) {
  background: #059669;
}

.btn-confirm-cancel {
  padding: 10px 20px;
  background: #F1F5F9;
  color: var(--text-secondary);
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-confirm-cancel:hover:not(:disabled) {
  background: #E2E8F0;
  color: var(--danger);
}

.btn-confirm-upload:disabled,
.btn-confirm-cancel:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-progress {
  width: 100%;
  height: 4px;
  background: #E2E8F0;
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--primary);
  transition: width 0.3s ease;
}

/* Toast Notification */
.toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 24px;
  border-radius: 12px;
  font-weight: 500;
  animation: slideUp 0.3s ease, fadeOut 0.3s ease 1.2s forwards;
  z-index: 3000;
}

.toast.success {
  background: #D1FAE5;
  color: #059669;
  border: 1px solid #10B981;
}

.toast-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #10B981;
  color: white;
  border-radius: 50%;
  font-size: 0.875rem;
  font-weight: 700;
}

@keyframes fadeOut {
  to {
    opacity: 0;
  }
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
}

.role-badge {
  display: flex;
  align-items: center;
  gap: 12px;
}

.badge {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}

.badge.head_owner {
  background: #D1FAE5;
  color: var(--primary);
}

.badge.co_owner {
  background: #DBEAFE;
  color: #3B82F6;
}

.badge.investor {
  background: #FEF3C7;
  color: #D97706;
}

.hint {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #047857;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #F1F5F9;
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: #E2E8F0;
}
</style>
