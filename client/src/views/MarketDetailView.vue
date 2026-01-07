<!--
  MarketDetailView.vue - Halaman detail market dengan tabs
  
  Fitur:
  - Breadcrumb navigation
  - Market header dengan avatar, nama, dan Edit button
  - Tab navigation: KANDANG | MEMBERS
  - Content berdasarkan tab aktif
-->

<template>
  <div class="market-detail">
    <!-- Breadcrumb -->
    <div class="breadcrumb">
      <router-link to="/market" class="crumb">Market</router-link>
      <span class="separator">>></span>
      <span class="crumb current">{{ market?.name || 'Loading...' }}</span>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Memuat data market...</p>
    </div>

    <template v-else-if="market">
      <!-- Market Header -->
      <div class="market-header">
        <div class="market-avatar">
          <img v-if="market.logo" :src="market.logo" :alt="market.name" />
          <span v-else>{{ market.name?.charAt(0) }}</span>
        </div>
        <div class="market-info">
          <h1 class="market-name">{{ market.name }}</h1>
          <p class="market-handle">@{{ market.handle || market.owner?.username || 'unknown' }}</p>
          <p class="market-bio" v-if="market.description">{{ market.description }}</p>
        </div>
        <button 
          v-if="canManage" 
          class="edit-btn"
          @click="showEditModal = true"
        >
          Edit Market
        </button>
      </div>



      <!-- Tab Navigation -->
      <div class="tab-nav">
        <button 
          v-for="tab in tabs" 
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- KANDANG Tab -->
        <div v-if="activeTab === 'kandang'" class="kandang-tab">
          <div class="section-header">
            <h2>Kandang : {{ kandangList.length }}/5</h2>
            <button v-if="canManage && kandangList.length > 0" class="btn-edit-kandang" @click="showEditKandangModal = true">
              ✏️ Edit Kandang
            </button>
          </div>
          <div class="card-grid">
            <KandangCard
              v-for="k in kandangList"
              :key="k._id"
              :kandang="k"
              :roi="k.roi || 0"
              @click="goToKandang(k._id)"
            />
            <AddCard 
              v-if="canManage"
              label="Tambah"
              @click="showAddKandangModal = true"
            />
          </div>
        </div>

        <!-- MEMBERS Tab -->
        <div v-if="activeTab === 'members'" class="members-tab">
          <div class="card-grid members-grid">
            <MemberCard
              v-for="m in memberList"
              :key="m._id"
              :member="m"
              :role="m.role"
              :isYou="m._id === currentUserId"
              @click="() => {}"
            />
            <AddCard 
              v-if="isHeadOwner"
              label="Invite Co Owner"
              @click="showInviteModal = true"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- Edit Market Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal-content">
        <h2>✏️ Edit Market</h2>
        <form @submit.prevent="handleUpdateMarket">
          <div class="form-group">
            <label>Nama Market</label>
            <input v-model="editForm.name" type="text" required />
          </div>
          <div class="form-group">
            <label>Handle / Username</label>
            <div class="input-prefix-group">
              <span class="prefix">@</span>
              <input 
                v-model="editForm.handle" 
                type="text" 
                class="handle-input"
                @input="checkHandle"
                required 
              />
            </div>
            <p class="field-hint" :class="{ 'status-ok': handleStatus.valid, 'status-error': !handleStatus.valid && !handleStatus.checking }">
              {{ handleStatus.message }}
            </p>
          </div>
          <div class="form-group">
            <label>Deskripsi</label>
            <textarea v-model="editForm.description" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>Logo Market</label>
            <div class="logo-upload-container">
              <div class="logo-preview" @click="triggerLogoInput">
                <img v-if="logoPreviewUrl" :src="logoPreviewUrl" alt="Logo Preview" />
                <span v-else class="logo-placeholder">{{ editForm.name?.charAt(0) || '?' }}</span>
                <div class="logo-overlay">
                  <span>📷</span>
                </div>
              </div>
              <input 
                ref="logoInput"
                type="file" 
                accept="image/*"
                class="hidden"
                @change="handleLogoSelect"
              />
              <p class="logo-hint">Klik untuk mengganti logo. Maks 5MB.</p>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="showEditModal = false">
              Batal
            </button>
            <button type="submit" class="btn-save" :disabled="saving || !isHandleValid">
              {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add Kandang Modal -->
    <div v-if="showAddKandangModal" class="modal-overlay" @click.self="showAddKandangModal = false">
      <div class="modal-content">
        <h2>🐔 Tambah Kandang</h2>
        <form @submit.prevent="handleAddKandang">
          <div class="form-group">
            <label>Nama Kandang</label>
            <input v-model="kandangForm.name" type="text" required placeholder="Ayam Pertama" />
          </div>
          <div class="form-group">
            <label>Deskripsi (opsional)</label>
            <textarea v-model="kandangForm.description" rows="2" placeholder="Kandang ayam petelur..."></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="showAddKandangModal = false">
              Batal
            </button>
            <button type="submit" class="btn-save" :disabled="saving">
              {{ saving ? 'Menambahkan...' : 'Tambah' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Kandang Modal -->
    <div v-if="showEditKandangModal" class="modal-overlay" @click.self="showEditKandangModal = false">
      <div class="modal-content">
        <h2>✏️ Edit Kandang</h2>
        <form @submit.prevent="handleEditKandang">
          <div class="form-group">
            <label>Pilih Kandang</label>
            <select v-model="editingKandangId" @change="onKandangSelect" required>
              <option value="">-- Pilih Kandang --</option>
              <option v-for="k in kandangList" :key="k._id" :value="k._id">
                {{ k.name }}
              </option>
            </select>
          </div>
          
          <template v-if="editingKandangId">
            <div class="form-group">
              <label>Nama Kandang</label>
              <input v-model="editKandangForm.name" type="text" required />
            </div>
            
            <div class="form-group">
              <label>Avatar Kandang</label>
              <div class="avatar-upload-container">
                <div class="avatar-preview" @click="triggerKandangAvatarInput">
                  <img v-if="kandangAvatarPreview" :src="kandangAvatarPreview" alt="Avatar" />
                  <span v-else class="avatar-placeholder">🐔</span>
                  <div class="avatar-overlay">
                    <span>📷</span>
                  </div>
                </div>
                <input 
                  ref="kandangAvatarInput" 
                  type="file" 
                  accept="image/*" 
                  @change="handleKandangAvatarSelect" 
                  hidden 
                />
                <p class="upload-hint">Klik untuk mengganti avatar. Maks 5MB.</p>
              </div>
            </div>
          </template>
          
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="closeEditKandangModal">
              Batal
            </button>
            <button type="submit" class="btn-save" :disabled="saving || !editingKandangId">
              {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Invite Co-Owner Modal -->
    <div v-if="showInviteModal" class="modal-overlay" @click.self="closeInviteModal">
      <div class="modal-content">
        <h2>👥 Invite Member</h2>
        <form @submit.prevent="handleInviteMember">
          <div class="form-group">
            <label>Cari Username</label>
            <div class="search-input-wrapper">
              <span class="search-prefix">@</span>
              <input 
                v-model="searchTerm" 
                type="text" 
                class="search-input"
                placeholder="ketik username..." 
                @input="onSearchInput"
                @focus="showDropdown = true"
              />
              <span v-if="isSearching" class="search-spinner">⌛</span>
            </div>
            <!-- Dropdown hasil search -->
            <div v-if="showDropdown && searchResults.length > 0" class="search-dropdown">
              <div 
                v-for="user in searchResults" 
                :key="user._id" 
                class="search-result-item"
                @click="selectUser(user)"
              >
                <div class="result-avatar">
                  <img v-if="user.avatar" :src="user.avatar" :alt="user.name" />
                  <span v-else>{{ user.name?.charAt(0) || '?' }}</span>
                </div>
                <div class="result-info">
                  <span class="result-name">{{ user.name }}</span>
                  <span class="result-username">@{{ user.username }}</span>
                </div>
              </div>
            </div>
            <!-- No results -->
            <p v-if="showDropdown && searchTerm.length >= 2 && !isSearching && searchResults.length === 0" class="no-results">
              Tidak ada user ditemukan
            </p>
          </div>

          <!-- Preview user terpilih -->
          <div v-if="selectedUser" class="selected-user-preview">
            <div class="preview-avatar">
              <img v-if="selectedUser.avatar" :src="selectedUser.avatar" :alt="selectedUser.name" />
              <span v-else>{{ selectedUser.name?.charAt(0) || '?' }}</span>
            </div>
            <div class="preview-info">
              <span class="preview-name">{{ selectedUser.name }}</span>
              <span class="preview-username">@{{ selectedUser.username }}</span>
            </div>
            <button type="button" class="preview-remove" @click="clearSelectedUser">&times;</button>
          </div>

          <p class="role-note">Member akan langsung ditambahkan sebagai <strong>Co-Owner</strong></p>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="closeInviteModal">
              Batal
            </button>
            <button type="submit" class="btn-save" :disabled="saving || !selectedUser">
              {{ saving ? 'Menambahkan...' : 'Tambah Co-Owner' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    
    <!-- Toast Notification -->
    <div v-if="toast.show" class="toast" :class="toast.type">
      <span class="toast-icon" :class="toast.type">
        {{ toast.type === 'success' ? '✓' : '✕' }}
      </span>
      <span>{{ toast.message }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import gsap from 'gsap'
import { useRoute, useRouter } from 'vue-router'
import { useMarketStore } from '@/stores/market'
import { useAuthStore } from '@/stores/auth'
import KandangCard from '@/components/market/KandangCard.vue'
import MemberCard from '@/components/market/MemberCard.vue'
import AddCard from '@/components/market/AddCard.vue'
import axios, { API_URL } from '@/api/axios'

const route = useRoute()
const router = useRouter()
const marketStore = useMarketStore()
const authStore = useAuthStore()

// State
const loading = ref(true)
const activeTab = ref('kandang')
const showEditModal = ref(false)
const showAddKandangModal = ref(false)
const showInviteModal = ref(false)
const saving = ref(false)

const kandangList = ref([])
const memberList = ref([])

const editForm = ref({ name: '', handle: '', description: '', logo: '' })
const pendingLogoFile = ref(null)
const logoPreviewUrl = ref('')
const logoInput = ref(null)
const kandangForm = ref({ name: '', description: '' })
// Invite member state
const searchTerm = ref('')
const searchResults = ref([])
const selectedUser = ref(null)
const isSearching = ref(false)
const showDropdown = ref(false)
let searchDebounceTimer = null

// Toast State
const toast = ref({
  show: false,
  message: '',
  type: 'success'
})

function showToast(message, type = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

// Computed
const market = computed(() => marketStore.currentMarket)
const currentUserId = computed(() => authStore.user?._id)
const canManage = computed(() => {
  if (!market.value || !currentUserId.value) return false
  
  // Head Owner
  if (market.value.ownerId === currentUserId.value) return true
  
  // Co-Owner
  const me = memberList.value.find(m => m._id === currentUserId.value)
  return me?.role === 'co_owner'
})

const isHeadOwner = computed(() => {
  if (!market.value || !currentUserId.value) return false
  return market.value.ownerId === currentUserId.value
})

const tabs = [
  { key: 'kandang', label: 'KANDANG' },
  { key: 'members', label: 'MEMBERS' }
]

const activeTabLabel = computed(() => {
  const tab = tabs.find(t => t.key === activeTab.value)
  return tab?.label || ''
})

// Methods
async function loadMarketData() {
  loading.value = true
  try {
    const identifier = route.params.id
    await marketStore.fetchMarket(identifier)
    
    if (market.value) {
      // Load kandang list
      try {
        const res = await axios.get(`${API_URL}/api/kandang/market/${market.value._id}`)
        kandangList.value = res.data
      } catch (e) {
        console.error('Error loading kandang:', e)
        kandangList.value = []
      }

      // Load members (Owner + Co-owners + Investors)
      try {
        const memberRes = await axios.get(`${API_URL}/api/markets/${market.value._id}/members`)
        memberList.value = memberRes.data
      } catch (e) {
        console.error('Error loading members:', e)
        // Fallback to owner if API fails
        memberList.value = [{
          _id: market.value.ownerId,
          name: market.value.owner?.name || 'Head Owner',
          avatar: market.value.owner?.avatar,
          role: 'head_owner'
        }]
      }

      // Initialize edit form
      editForm.value = {
        name: market.value.name,
        handle: market.value.handle || '',
        description: market.value.description || '',
        logo: market.value.logo || ''
      }
      logoPreviewUrl.value = market.value.logo || ''
      pendingLogoFile.value = null
      
      // Reset handle status
      if (market.value.handle) {
         handleStatus.value = { valid: true, checking: false, message: 'Handle saat ini' }
      }
    }
  } catch (e) {
    console.error('Error loading market:', e)
  } finally {
    loading.value = false
  }
}

// Handle Validation
const handleStatus = ref({ valid: true, checking: false, message: '' })
let debounceTimer = null
const isHandleValid = computed(() => editForm.value.handle && handleStatus.value.valid && !handleStatus.value.checking)

async function checkHandle() {
  const handle = editForm.value.handle
  
  if (market.value && handle === market.value.handle) {
    handleStatus.value = { valid: true, checking: false, message: 'Handle saat ini' }
    return
  }

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

function goToKandang(kandangId) {
  if (market.value?.handle) {
    router.push(`/market/@${market.value.handle}/kandang/${kandangId}`)
  } else {
    router.push(`/kandang/${kandangId}`)
  }
}

// Navigasi State
const isNavigating = ref(false)
const transitionOverlay = ref(null)

function triggerLogoInput() {
  logoInput.value.click()
}

function handleLogoSelect(event) {
  const file = event.target.files[0]
  if (!file) return
  
  if (file.size > 5 * 1024 * 1024) {
    alert('Ukuran file maksimal 5MB')
    return
  }
  
  pendingLogoFile.value = file
  logoPreviewUrl.value = URL.createObjectURL(file)
}

async function handleUpdateMarket() {
  if (!market.value) return
  saving.value = true
  try {
    // Simpan handle lama untuk pengecekan redirect nanti
    const oldHandle = market.value.handle
    const newHandle = editForm.value.handle
    
    let logoStorageId = undefined
    
    // Upload Logo if pending
    if (pendingLogoFile.value) {
       // 1. Get URL
       const { data } = await axios.post(`${API_URL}/api/markets/upload-url`)
       const uploadUrl = data.uploadUrl
       
       // 2. Upload
       const uploadRes = await fetch(uploadUrl, {
         method: 'POST',
         headers: { 'Content-Type': pendingLogoFile.value.type },
         body: pendingLogoFile.value
       })
       
       if (!uploadRes.ok) throw new Error('Gagal upload gambar')
       const resData = await uploadRes.json()
       logoStorageId = resData.storageId
    }

    await marketStore.updateMarket({
      marketId: market.value._id,
      name: editForm.value.name,
      handle: newHandle !== oldHandle ? newHandle : undefined,
      description: editForm.value.description || undefined,
      logo: pendingLogoFile.value ? undefined : editForm.value.logo, // If new file, ignore old logo string
      logoStorageId: logoStorageId, // Pass storage ID if any
      userId: currentUserId.value
    })
    showEditModal.value = false
    
    // Redirect jika handle berubah - untuk keamanan URL
    if (newHandle && newHandle !== oldHandle) {
       showToast('Market berhasil diupdate! Redirecting...', 'success')
       setTimeout(() => {
          router.replace(`/market/@${newHandle}`)
       }, 1000)
    } else {
       await loadMarketData()
       showToast('Profil market berhasil diperbarui', 'success')
    }
  } catch (e) {
    console.error('Error updating market:', e)
    showToast(e.response?.data?.error || 'Gagal update market', 'error')
  } finally {
    saving.value = false
  }
}

async function handleAddKandang() {
  if (!market.value) return
  saving.value = true
  try {
    await axios.post(`${API_URL}/api/kandang`, {
      name: kandangForm.value.name,
      description: kandangForm.value.description || undefined,
      marketId: market.value._id,
      userId: currentUserId.value
    })
    showAddKandangModal.value = false
    kandangForm.value = { name: '', description: '' }
    await loadMarketData()
  } catch (e) {
    console.error('Error adding kandang:', e)
    alert(e.response?.data?.error || 'Gagal menambahkan kandang')
  } finally {
    saving.value = false
  }
}

// --- Edit Kandang Logic ---
const showEditKandangModal = ref(false)
const editingKandangId = ref('')
const editKandangForm = ref({ name: '', avatar: '' })
const pendingKandangAvatarFile = ref(null)
const kandangAvatarPreview = ref('')
const kandangAvatarInput = ref(null)

function onKandangSelect() {
  if (!editingKandangId.value) {
    editKandangForm.value = { name: '', avatar: '' }
    kandangAvatarPreview.value = ''
    pendingKandangAvatarFile.value = null
    return
  }
  
  const selectedKandang = kandangList.value.find(k => k._id === editingKandangId.value)
  if (selectedKandang) {
    editKandangForm.value = { 
      name: selectedKandang.name, 
      avatar: selectedKandang.avatar || '' 
    }
    kandangAvatarPreview.value = selectedKandang.avatar || ''
    pendingKandangAvatarFile.value = null
  }
}

function triggerKandangAvatarInput() {
  kandangAvatarInput.value.click()
}

function handleKandangAvatarSelect(event) {
  const file = event.target.files[0]
  if (!file) return
  
  if (file.size > 5 * 1024 * 1024) {
    alert('Ukuran file maksimal 5MB')
    return
  }
  
  pendingKandangAvatarFile.value = file
  kandangAvatarPreview.value = URL.createObjectURL(file)
}

function closeEditKandangModal() {
  showEditKandangModal.value = false
  editingKandangId.value = ''
  editKandangForm.value = { name: '', avatar: '' }
  pendingKandangAvatarFile.value = null
  kandangAvatarPreview.value = ''
}

async function handleEditKandang() {
  if (!editingKandangId.value) return
  saving.value = true
  
  try {
    let avatarStorageId = undefined
    
    // Upload Avatar if pending
    if (pendingKandangAvatarFile.value) {
       // 1. Get URL
       const { data } = await axios.post(`${API_URL}/api/markets/upload-url`) 
       const uploadUrl = data.uploadUrl
       
       // 2. Upload
       const uploadRes = await fetch(uploadUrl, {
         method: 'POST',
         headers: { 'Content-Type': pendingKandangAvatarFile.value.type },
         body: pendingKandangAvatarFile.value
       })
       
       if (!uploadRes.ok) throw new Error('Gagal upload gambar')
       const resData = await uploadRes.json()
       avatarStorageId = resData.storageId
    }

    // 3. Update Kandang
    await axios.put(`${API_URL}/api/kandang/${editingKandangId.value}`, {
      name: editKandangForm.value.name,
      avatarStorageId: avatarStorageId,
      // If no new file, keep existing avatar string (handled by backend if undefined, 
      // but here we only pass avatarStorageId if new. Existing avatar string is not cleared unless we explicitly want to)
      // Actually if avatarStorageId is passed, backend updates avatar.
      // If not passed, we don't send anything regarding avatar so it stays same.
      // Or we can send 'avatar: undefined'.
    })
    
    closeEditKandangModal()
    showToast('Kandang berhasil diupdate', 'success')
    await loadMarketData()
    
  } catch (e) {
     console.error('Error updating kandang:', e)
     showToast(e.response?.data?.error || 'Gagal update kandang', 'error')
  } finally {
     saving.value = false
  }
}

// --- Invite Member Functions ---
function closeInviteModal() {
  showInviteModal.value = false
  searchTerm.value = ''
  searchResults.value = []
  selectedUser.value = null
  showDropdown.value = false
}

function onSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  
  const term = searchTerm.value.trim()
  if (term.length < 2) {
    searchResults.value = []
    return
  }
  
  isSearching.value = true
  showDropdown.value = true
  
  searchDebounceTimer = setTimeout(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/users/search`, {
        params: { 
          term, 
          limit: 10,
          excludeUserId: currentUserId.value
        }
      })
      // Exclude users yang sudah jadi member
      const memberIds = memberList.value.map(m => m._id)
      searchResults.value = res.data.filter(u => !memberIds.includes(u._id))
    } catch (e) {
      console.error('Search error:', e)
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }, 300)
}

function selectUser(user) {
  selectedUser.value = user
  searchTerm.value = ''
  searchResults.value = []
  showDropdown.value = false
}

function clearSelectedUser() {
  selectedUser.value = null
}

async function handleInviteMember() {
  if (!selectedUser.value || !market.value) return
  
  saving.value = true
  try {
    await axios.post(`${API_URL}/api/markets/${market.value._id}/members`, {
      userId: selectedUser.value._id,
      invitedBy: currentUserId.value
    })
    
    showToast(`${selectedUser.value.name} berhasil ditambahkan sebagai Co-Owner!`, 'success')
    closeInviteModal()
    await loadMarketData() // Refresh member list
  } catch (e) {
    console.error('Invite error:', e)
    showToast(e.response?.data?.error || 'Gagal menambahkan member', 'error')
  } finally {
    saving.value = false
  }
}

// GSAP Animations
function animatePageEnter() {
  const tl = gsap.timeline()
  
  tl.from('.market-avatar', {
    y: 20,
    opacity: 0,
    duration: 0.6,
    ease: 'back.out(1.7)'
  })
  .from('.market-info', {
    y: 20,
    opacity: 0,
    duration: 0.5,
    ease: 'power2.out'
  }, '-=0.4')
  .from('.tab-nav', {
    y: 10,
    opacity: 0,
    duration: 0.4,
    ease: 'power2.out'
  }, '-=0.3')
  .from('.tab-content', {
    y: 10,
    opacity: 0,
    duration: 0.4,
    ease: 'power2.out'
  }, '-=0.2')
}

function animateTabChange() {
  nextTick(() => {
    gsap.fromTo('.card-grid > *', 
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
    )
  })
}

function animateModalOpen(overlayClass, contentClass) {
  nextTick(() => {
    gsap.fromTo(overlayClass, 
      { opacity: 0 }, 
      { opacity: 1, duration: 0.3, ease: 'power2.out' }
    )
    gsap.fromTo(contentClass,
      { scale: 0.9, opacity: 0, y: 20 },
      { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.2)' }
    )
  })
}

// Watchers
watch(activeTab, () => {
  animateTabChange()
})

watch(showEditModal, (val) => {
  if (val) animateModalOpen('.modal-overlay', '.modal-content')
})

watch(showAddKandangModal, (val) => {
  if (val) animateModalOpen('.modal-overlay', '.modal-content')
})

watch(showEditKandangModal, (val) => {
  if (val) animateModalOpen('.modal-overlay', '.modal-content')
})

watch(showInviteModal, (val) => {
  if (val) animateModalOpen('.modal-overlay', '.modal-content')
})

// Lifecycle
onMounted(() => {
  authStore.loadUser()
  loadMarketData().then(() => {
    nextTick(() => {
      animatePageEnter()
      animateTabChange() // Initial tab animation
    })
  })
})

// Watch for route changes
watch(() => route.params.id, () => {
  if (route.params.id) {
    loadMarketData()
  }
})
</script>

<style scoped>
.market-detail {
  max-width: 900px;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.crumb {
  color: #666666;
  text-decoration: none;
}

.crumb:hover {
  text-decoration: underline;
}

.crumb.current {
  color: #1A1A1A;
  font-weight: 500;
}

.separator {
  color: #999999;
}

/* Loading */
.loading-state {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E5E5E5;
  border-top-color: #4ADE80;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Market Header */
.market-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px;
  background: #FFFFFF;
  border-radius: 12px;
}

.market-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  background: #E5E5E5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 600;
  color: #666666;
}

.market-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.market-info {
  flex: 1;
}

.market-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 4px 0;
}

.market-handle {
  color: #666666;
  font-size: 0.9rem;
  margin: 0;
}

.market-bio {
  font-size: 0.95rem;
  color: #334155;
  margin: 8px 0 0 0;
  line-height: 1.5;
  white-space: pre-line;
}

.edit-btn {
  padding: 10px 20px;
  background: #FFFFFF;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn:hover {
  background: #F5F5F5;
}



/* Tab Navigation */
.tab-nav {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid #E5E5E5;
  padding-bottom: 8px;
}

.tab-item {
  padding: 8px 16px;
  background: none;
  border: none;
  font-size: 0.9rem;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
  margin-bottom: -9px;
}

.tab-item:hover {
  color: #1A1A1A;
}

.tab-item.active {
  color: #1A1A1A;
  border-bottom-color: #1A1A1A;
}

/* Section Header */
.section-header {
  margin-bottom: 16px;
}

.section-header h2 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

/* Card Grid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
}

.members-grid {
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
}

.empty-text {
  color: #666666;
  text-align: center;
  padding: 40px;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
}

.modal-content {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
}

.modal-content h2 {
  margin: 0 0 20px 0;
  font-size: 1.2rem;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: #1A1A1A;
  margin-bottom: 6px;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #4ADE80;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-cancel {
  flex: 1;
  padding: 12px;
  background: #FFFFFF;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
}

.btn-cancel:hover {
  background: #F5F5F5;
}

.btn-save {
  flex: 1;
  padding: 12px;
  background: #4ADE80;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  color: #000000;
}

.btn-save:hover:not(:disabled) {
  background: #22C55E;
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Handle Input Styles */
.input-prefix-group {
  display: flex;
  align-items: center;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
}

.input-prefix-group:focus-within {
  border-color: #4ADE80;
}

.prefix {
  padding: 0 12px;
  background: #F8FAFC;
  color: #64748B;
  font-weight: 500;
  border-right: 1px solid #E5E5E5;
  height: 42px;
  display: flex;
  align-items: center;
}

.handle-input {
  border: none !important;
  border-radius: 0 !important;
  height: 42px;
}

.handle-input:focus {
  outline: none;
}

.field-hint {
  font-size: 0.8rem;
  margin-top: 4px;
  color: #666;
}

.status-ok {
  color: #10B981;
}

.status-error {
  color: #DC2626;
}

/* Avatar Upload UI */
.avatar-upload-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.avatar-preview {
  width: 100px;
  height: 100px;
  border-radius: 12px;
  background: #F8FAFC;
  border: 2px dashed #CBD5E1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
}

.avatar-preview:hover {
  border-color: #4ADE80;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 2.5rem;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.avatar-preview:hover .avatar-overlay {
  opacity: 1;
}

.avatar-overlay span {
  font-size: 1.5rem;
}

.upload-hint {
  font-size: 0.8rem;
  color: #64748B;
}

.btn-edit-kandang {
  font-size: 0.9rem;
  padding: 8px 16px;
  background: white;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  color: #1A1A1A;
  font-weight: 500;
  cursor: pointer;
  margin-left: auto;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-edit-kandang:hover {
  background: #F8FAFC;
  border-color: #CBD5E1;
}

/* Toast Notification */
.toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  border-radius: 50px;
  font-weight: 500;
  animation: slideUp 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
  z-index: 9999;
  box-shadow: 0 8px 20px rgba(0,0,0,0.15);
  width: max-content;
  max-width: 90vw;
  white-space: nowrap;
}

.toast.success {
  background: #D1FAE5;
  color: #059669;
  border: 1px solid #10B981;
}

.toast.error {
  background: #FEE2E2;
  color: #DC2626;
  border: 1px solid #DC2626;
}

.toast-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
}

.toast-icon.success {
  background: #10B981;
}

.toast-icon.error {
  background: #DC2626;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

@keyframes fadeOut {
  to {
    opacity: 0;
  }
}
/* Logo Upload */
.logo-upload-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border: 1px dashed #E2E8F0;
  border-radius: 12px;
  background: #F8FAFC;
}

.logo-preview {
  width: 100px;
  height: 100px;
  border-radius: 12px;
  background: #E5E5E5;
  position: relative;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: all 0.2s;
}

.logo-preview:hover {
  transform: scale(1.02);
}

.logo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo-placeholder {
  font-size: 2.5rem;
  font-weight: 700;
  color: #64748B;
}

.logo-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.logo-preview:hover .logo-overlay {
  opacity: 1;
}

.logo-overlay span {
  font-size: 1.5rem;
}

.logo-hint {
  font-size: 0.8rem;
  color: #64748B;
  margin: 0;
}

.hidden {
  display: none;
}


/* Transition Overlay */
.transition-overlay {
  position: fixed;
  inset: 0;
  background: white;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-lg {
  width: 50px;
  height: 50px;
  border: 4px solid #E5E5E5;
  border-top-color: #10B981;
  border-radius: 50%;
}

/* Responsive Market Header */
@media (max-width: 600px) {
  .market-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .market-avatar {
    width: 60px;
    height: 60px;
    font-size: 1.5rem;
  }

  .market-name {
    font-size: 1.25rem;
  }

  .edit-btn {
    align-self: flex-end;
    padding: 8px 16px;
    font-size: 0.85rem;
  }
}

/* Search Input for Invite Modal */
.search-input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.search-prefix {
  padding: 12px;
  color: #666;
  background: #F5F5F5;
  font-weight: 500;
}

.search-input {
  flex: 1;
  border: none;
  padding: 12px;
  font-size: 1rem;
  outline: none;
}

.search-spinner {
  padding-right: 12px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  margin-top: 4px;
  max-height: 250px;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 100;
}

.form-group {
  position: relative;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-result-item:hover {
  background: #F5F5F5;
}

.result-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: #E5E5E5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #666;
}

.result-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-name {
  font-weight: 500;
  color: #1A1A1A;
}

.result-username {
  font-size: 0.85rem;
  color: #666;
}

.no-results {
  padding: 12px;
  text-align: center;
  color: #999;
  font-size: 0.9rem;
}

/* Selected User Preview */
.selected-user-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #F0FDF4;
  border: 1px solid #22C55E;
  border-radius: 8px;
  margin-bottom: 16px;
}

.preview-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  background: #22C55E;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
}

.preview-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preview-name {
  font-weight: 600;
  color: #1A1A1A;
}

.preview-username {
  font-size: 0.85rem;
  color: #666;
}

.preview-remove {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #999;
  cursor: pointer;
  padding: 4px 8px;
}

.preview-remove:hover {
  color: #EF4444;
}

.role-note {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #F5F5F5;
  border-radius: 6px;
}

</style>
