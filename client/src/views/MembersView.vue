<template>
  <div class="members-layout">
    <!-- Navbar -->
    <nav class="navbar">
      <router-link to="/dashboard" class="back-btn">← Kembali</router-link>
      <h2>Anggota Kandang</h2>
      <button 
        v-if="isHeadOwner" 
        class="btn btn-primary" 
        @click="showAddModal = true"
      >
        + Tambah
      </button>
      <div v-else></div>
    </nav>

    <!-- Loading state -->
    <div v-if="loading" class="page loading-state">
      <p>Memuat data anggota...</p>
    </div>

    <!-- Main Content -->
    <main v-else class="page">
      <!-- Head Owner -->
      <section class="member-section">
        <h3 class="section-label">Head Owner</h3>
        <div class="card member-card">
          <div class="member-avatar owner">👑</div>
          <div class="member-info">
            <div class="member-name">{{ headOwner?.name || 'Head Owner' }}</div>
            <div class="member-email">{{ headOwner?.email || 'owner@example.com' }}</div>
          </div>
        </div>
      </section>

      <!-- Co Owners -->
      <section class="member-section">
        <h3 class="section-label">Co Owner</h3>
        <div v-if="coOwners.length" class="member-list">
          <div v-for="member in coOwners" :key="member._id" class="card member-card">
            <div class="member-avatar co-owner">👷</div>
            <div class="member-info">
              <div class="member-name">{{ member.user?.name }}</div>
              <div class="member-email">{{ member.user?.email }}</div>
            </div>
            <div v-if="isHeadOwner" class="member-actions">
              <button 
                class="action-btn demote-btn"
                @click="updateRole(member, 'investor')"
              >
                Demote
              </button>
              <button class="action-btn remove-btn" @click="removeMember(member)">Hapus</button>
            </div>
          </div>
        </div>
        <p v-else class="empty-text">Belum ada co-owner</p>
      </section>

      <!-- Investors -->
      <section class="member-section">
        <h3 class="section-label">Investor</h3>
        <div v-if="investors.length" class="member-list">
          <div v-for="member in investors" :key="member._id" class="card member-card">
            <div class="member-avatar investor">💼</div>
            <div class="member-info">
              <div class="member-name">{{ member.user?.name }}</div>
              <div class="member-email">{{ member.user?.email }}</div>
            </div>
            <div v-if="isHeadOwner" class="member-actions">
              <button 
                class="action-btn promote-btn"
                @click="updateRole(member, 'co_owner')"
              >
                Promote
              </button>
              <button class="action-btn remove-btn" @click="removeMember(member)">Hapus</button>
            </div>
          </div>
        </div>
        <p v-else class="empty-text">Belum ada investor</p>
      </section>
    </main>

    <!-- Add Member Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>Tambah Anggota</h3>
          <button class="close-btn" @click="showAddModal = false">✕</button>
        </div>
        
        <form @submit.prevent="addMember">
          <div class="form-group">
            <label>Pilih User</label>
            <select v-model="newMember.userId" class="input" required>
              <option value="">-- Pilih user --</option>
              <option 
                v-for="user in availableUsers" 
                :key="user._id" 
                :value="user._id"
              >
                {{ user.name }} ({{ user.email }})
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Role</label>
            <select v-model="newMember.role" class="input">
              <option value="investor">Investor</option>
              <option value="co_owner">Co Owner</option>
            </select>
          </div>
          
          <button type="submit" class="btn btn-primary btn-lg w-full mt-md" :disabled="addLoading || !newMember.userId">
            {{ addLoading ? 'Menambahkan...' : 'Tambah Anggota' }}
          </button>
        </form>
      </div>
    </div>

    <!-- Toast Notification -->
    <div v-if="toast.show" :class="['toast', toast.type]">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import axios from 'axios'

const API_URL = 'http://localhost:3001/api'

const route = useRoute()
const authStore = useAuthStore()

const showAddModal = ref(false)
const loading = ref(true)
const addLoading = ref(false)
const members = ref([])
const headOwner = ref(null)
const allUsers = ref([])
const kandangId = ref(null)

// Toast notification
const toast = ref({ show: false, message: '', type: 'success' })

const newMember = ref({
  userId: '',
  role: 'investor'
})

// Computed - cek apakah current user adalah head owner dari kandang ini
const isHeadOwner = computed(() => {
  if (!authStore.user || !headOwner.value) return false
  return authStore.user._id === headOwner.value._id
})

const coOwners = computed(() => members.value.filter(m => m.role === 'co_owner'))
const investors = computed(() => members.value.filter(m => m.role === 'investor'))

// Available users = semua user kecuali yang udah jadi member atau head owner
const availableUsers = computed(() => {
  const memberIds = members.value.map(m => m.userId)
  const headOwnerId = headOwner.value?._id
  return allUsers.value.filter(u => 
    !memberIds.includes(u._id) && u._id !== headOwnerId
  )
})

function showToast(message, type = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

async function fetchKandangData() {
  try {
    const res = await axios.get(`${API_URL}/kandang/${kandangId.value}`)
    headOwner.value = res.data.headOwner
  } catch (e) {
    console.error('Error fetching kandang:', e)
    showToast('Gagal memuat data kandang', 'error')
  }
}

async function fetchMembers() {
  try {
    const res = await axios.get(`${API_URL}/kandang/${kandangId.value}/members`)
    members.value = res.data
  } catch (e) {
    console.error('Error fetching members:', e)
    showToast('Gagal memuat data anggota', 'error')
  }
}

async function fetchAllUsers() {
  try {
    const res = await axios.get(`${API_URL}/users`)
    allUsers.value = res.data
  } catch (e) {
    console.error('Error fetching users:', e)
  }
}

onMounted(async () => {
  authStore.loadUser()
  kandangId.value = route.params.id
  
  loading.value = true
  await Promise.all([
    fetchKandangData(),
    fetchMembers(),
    fetchAllUsers()
  ])
  loading.value = false
})

async function addMember() {
  if (!newMember.value.userId) return
  
  addLoading.value = true
  try {
    await axios.post(`${API_URL}/kandang/${kandangId.value}/members`, {
      userId: newMember.value.userId,
      role: newMember.value.role
    })
    
    // Reload members dan reset form
    await fetchMembers()
    showAddModal.value = false
    newMember.value = { userId: '', role: 'investor' }
    showToast('Anggota berhasil ditambahkan!')
  } catch (e) {
    console.error('Error adding member:', e)
    showToast(e.response?.data?.error || 'Gagal menambahkan anggota', 'error')
  } finally {
    addLoading.value = false
  }
}

async function updateRole(member, newRole) {
  if (member.role === newRole) return
  
  try {
    await axios.patch(`${API_URL}/kandang/${kandangId.value}/members/${member.userId}`, {
      role: newRole
    })
    
    // Update local state langsung
    member.role = newRole
    showToast(`Role berhasil diubah ke ${newRole === 'co_owner' ? 'Co Owner' : 'Investor'}`)
  } catch (e) {
    console.error('Error updating role:', e)
    showToast('Gagal mengubah role', 'error')
    // Reload buat revert
    await fetchMembers()
  }
}

async function removeMember(member) {
  if (!confirm(`Hapus ${member.user?.name} dari kandang?`)) return
  
  try {
    await axios.delete(`${API_URL}/kandang/${kandangId.value}/members/${member.userId}`)
    
    // Update local state
    members.value = members.value.filter(m => m._id !== member._id)
    showToast('Anggota berhasil dihapus')
  } catch (e) {
    console.error('Error removing member:', e)
    showToast('Gagal menghapus anggota', 'error')
  }
}
</script>

<style scoped>
.members-layout {
  min-height: 100vh;
  background: var(--bg-primary);
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  color: var(--text-secondary);
}

.back-btn {
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
}

.member-section {
  margin-bottom: 24px;
}

.section-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.member-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.member-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.member-avatar.owner { background: #FEF3C7; }
.member-avatar.co-owner { background: #E0E7FF; }
.member-avatar.investor { background: #D1FAE5; }

.member-info {
  flex: 1;
}

.member-name {
  font-weight: 600;
  color: var(--text-primary);
}

.member-email {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.promote-btn {
  background: #22C55E;
  color: white;
}

.promote-btn:hover {
  background: #16A34A;
}

.demote-btn {
  background: #EF4444;
  color: white;
}

.demote-btn:hover {
  background: #DC2626;
}

.remove-btn {
  background: #F3F4F6;
  color: #6B7280;
}

.remove-btn:hover {
  background: #E5E7EB;
  color: #EF4444;
}

.empty-text {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-style: italic;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

/* Toast notification */
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  z-index: 1000;
  animation: slideUp 0.3s ease;
}

.toast.success {
  background: var(--success, #22C55E);
}

.toast.error {
  background: var(--danger, #EF4444);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
