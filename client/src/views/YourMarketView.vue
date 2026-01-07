<!--
  YourMarketView.vue - Halaman market milik user
  
  Fitur:
  - List market yang dimiliki user (max 2)
  - Edit & Delete market
  - Info status aktif/nonaktif
  
  Sesuai mockup TikTok SPA style
-->

<template>
  <div class="your-market-view">
    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">🏠 Your Markets</h1>
      <p class="subtitle">Kelola market yang kamu miliki</p>
      
      <!-- Market Counter -->
      <div class="market-counter">
        <span class="counter-badge">{{ myMarkets.length }}/2 Markets</span>
        <router-link 
          v-if="canCreate" 
          to="/market/create" 
          class="btn-add"
        >
          ➕ Tambah Market
        </router-link>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Memuat markets...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="myMarkets.length === 0" class="empty-state">
      <span class="empty-icon">🏪</span>
      <h3>Belum punya market</h3>
      <p>Buat market pertamamu dan mulai kelola kandang!</p>
      <router-link to="/market/create" class="btn-primary">
        ➕ Buat Market Pertama
      </router-link>
    </div>

    <!-- Market List -->
    <div v-else class="market-list">
      <div 
        v-for="market in myMarkets" 
        :key="market._id" 
        class="market-card"
      >
        <div class="market-content" @click="goToMarket(market)">
          <div class="market-logo">
            <img v-if="market.logo" :src="market.logo" alt="Logo" />
            <span v-else class="logo-placeholder">{{ market.name.charAt(0) }}</span>
          </div>
          <div class="market-info">
            <h3 class="market-name">{{ market.name }}</h3>
            <p class="market-desc">{{ market.description || 'Tidak ada deskripsi' }}</p>
            <div class="market-stats">
              <span class="stat-item" :class="{ active: market.isActive, inactive: !market.isActive }">
                {{ market.isActive ? '🟢 Aktif' : '🔴 Nonaktif' }}
              </span>
            </div>
          </div>
          <span class="arrow-icon">›</span>
        </div>
        <!-- Action Buttons -->
        <div class="card-actions">
          <label class="toggle-container" @click.stop>
            <span class="toggle-label">{{ market.isActive ? 'Aktif' : 'Nonaktif' }}</span>
            <div class="toggle-switch">
              <input 
                type="checkbox" 
                :checked="market.isActive" 
                @change="toggleMarketStatus(market)"
              />
              <span class="toggle-slider"></span>
            </div>
          </label>
          <button class="btn-delete-action" @click.stop="confirmDelete(market)">
            🗑️ Hapus Market
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal-content delete-modal">
        <h2>🗑️ Hapus Market</h2>
        <p>Yakin ingin menghapus market <strong>{{ deletingMarket?.name }}</strong>?</p>
        <p class="warning-text">⚠️ Semua data kandang di market ini juga akan dihapus!</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showDeleteModal = false">Batal</button>
          <button class="btn-delete" @click="handleDelete" :disabled="deleting">
            {{ deleting ? 'Menghapus...' : 'Hapus' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMarketStore } from '@/stores/market'
import gsap from 'gsap'
import { useAuthStore } from '@/stores/auth'
import axios, { API_URL } from '@/api/axios'

const router = useRouter()
const marketStore = useMarketStore()
const authStore = useAuthStore()

const loading = computed(() => marketStore.loading)
const myMarkets = computed(() => marketStore.myMarkets)
const canCreate = computed(() => marketStore.canCreateMarket)

// Delete Modal State
const showDeleteModal = ref(false)
const deletingMarket = ref(null)
const deleting = ref(false)

onMounted(async () => {
  authStore.loadUser()
  if (authStore.user?._id) {
    await marketStore.fetchMyMarkets(authStore.user._id)
    await marketStore.checkMarketCount(authStore.user._id)
  }
  animateHeader()
})

// Animations
function animateHeader() {
  gsap.from('.page-header', {
    y: -20,
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out'
  })
}

function animateList() {
  nextTick(() => {
    const cards = document.querySelectorAll('.market-list > *')
    if (cards.length > 0) {
      gsap.fromTo(cards, 
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out', clearProps: 'all' }
      )
    }
  })
}

// Watchers
watch(loading, (newVal) => {
  if (!newVal) {
    animateList()
  }
})

watch(myMarkets, () => {
  if (!loading.value) {
    animateList()
  }
})

function goToMarket(market) {
  if (market.handle) {
    router.push(`/market/@${market.handle}`)
  } else {
    router.push(`/market/${market._id}`)
  }
}

function confirmDelete(market) {
  deletingMarket.value = market
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!deletingMarket.value) return
  deleting.value = true
  try {
    await axios.delete(`${API_URL}/api/markets/${deletingMarket.value._id}`, {
      data: { userId: authStore.user._id }
    })
    showDeleteModal.value = false
    deletingMarket.value = null
    // Refresh list
    await marketStore.fetchMyMarkets(authStore.user._id)
    await marketStore.checkMarketCount(authStore.user._id)
  } catch (e) {
    console.error('Error deleting market:', e)
    alert(e.response?.data?.error || 'Gagal menghapus market')
  } finally {
    deleting.value = false
  }
}

async function toggleMarketStatus(market) {
  try {
    const newStatus = !market.isActive
    await axios.patch(`${API_URL}/api/markets/${market._id}`, {
      userId: authStore.user._id,
      isActive: newStatus
    })
    // Refresh list
    await marketStore.fetchMyMarkets(authStore.user._id)
  } catch (e) {
    console.error('Error toggling market status:', e)
    alert(e.response?.data?.error || 'Gagal mengubah status market')
  }
}
</script>

<style scoped>
.your-market-view {
  max-width: 700px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 8px 0;
}

.subtitle {
  color: #666666;
  margin: 0 0 16px 0;
}

.market-counter {
  display: flex;
  align-items: center;
  gap: 16px;
}

.counter-badge {
  padding: 8px 16px;
  background: #FFFFFF;
  border-radius: 20px;
  font-weight: 600;
  color: #1A1A1A;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.btn-add {
  padding: 10px 20px;
  background: #4ADE80;
  color: #000000;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-add:hover {
  background: #22C55E;
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

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: #FFFFFF;
  border-radius: 16px;
}

.empty-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 16px;
}

.empty-state h3 {
  color: #1A1A1A;
  margin-bottom: 8px;
}

.empty-state p {
  color: #666666;
  margin-bottom: 24px;
}

.btn-primary {
  display: inline-block;
  padding: 12px 24px;
  background: #4ADE80;
  color: #000000;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
}

/* Market List */
.market-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.market-card {
  background: #FFFFFF;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.market-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  cursor: pointer;
}

.market-content:hover {
  background: #FAFAFA;
}

.market-logo {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}

.market-logo img {
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
  background: linear-gradient(135deg, #4ADE80, #22C55E);
  color: #FFFFFF;
  font-size: 1.2rem;
  font-weight: 700;
}

.market-info {
  flex: 1;
}

.market-name {
  font-size: 1rem;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 4px 0;
}

.market-desc {
  font-size: 0.85rem;
  color: #666666;
  margin: 0 0 8px 0;
}

.stat-item {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 20px;
}

.stat-item.active {
  background: #D1FAE5;
  color: #059669;
}

.stat-item.inactive {
  background: #FEE2E2;
  color: #DC2626;
}

.arrow-icon {
  font-size: 1.5rem;
  color: #CCCCCC;
  font-weight: 300;
}

/* Card Action Buttons */
.card-actions {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid #F1F5F9;
  background: #FAFAFA;
  align-items: center;
}

/* Toggle Container */
.toggle-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #FFFFFF;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  cursor: pointer;
}

.toggle-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #374151;
}

.toggle-switch {
  position: relative;
  width: 48px;
  height: 26px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #CBD5E1;
  transition: .3s;
  border-radius: 26px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #34C759 !important; /* iOS Green */
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(22px);
}

.btn-edit {
  flex: 1;
  padding: 12px 16px;
  background: #FFFFFF;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-edit:hover {
  background: #F8FAFC;
  border-color: #4ADE80;
  color: #059669;
}

.btn-delete-action {
  flex: 1;
  padding: 12px 16px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #DC2626;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-delete-action:hover {
  background: #FEE2E2;
  border-color: #DC2626;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
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
  margin-bottom: 6px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #4ADE80;
}

.toggle-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.toggle input {
  display: none;
}

.toggle-slider {
  width: 44px;
  height: 24px;
  background: #CBD5E1;
  border-radius: 12px;
  position: relative;
  transition: all 0.2s;
}

.toggle-slider::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  background: #FFFFFF;
  border-radius: 50%;
  top: 3px;
  left: 3px;
  transition: all 0.2s;
}

.toggle input:checked + .toggle-slider {
  background: #4ADE80;
}

.toggle input:checked + .toggle-slider::after {
  left: 23px;
}

.toggle-label {
  font-weight: 500;
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
  cursor: pointer;
}

.btn-save {
  flex: 1;
  padding: 12px;
  background: #4ADE80;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.delete-modal {
  text-align: center;
}

.delete-modal p {
  color: #666666;
  margin-bottom: 8px;
}

.warning-text {
  color: #DC2626 !important;
  font-size: 0.875rem;
  margin-bottom: 20px !important;
}

.btn-delete {
  flex: 1;
  padding: 12px;
  background: #DC2626;
  border: none;
  border-radius: 8px;
  color: #FFFFFF;
  font-weight: 600;
  cursor: pointer;
}

.btn-delete:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
