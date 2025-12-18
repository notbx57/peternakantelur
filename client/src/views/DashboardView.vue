<!--
  DashboardView.vue - Halaman utama dashboard
  
  Ini view utama yang nampilpin:
  - Statistik pemasukan/pengeluaran/saldo
  - Chart perubahan saldo
  - Tabel transaksi
  - Sidebar navigasi
  
  Semua logic udah dipindahin ke composable `useDashboard.js`
  Biar file ini ga keberatan dan lebih gampang di-maintain
  
  Components yang dipake:
  - StatsCard: card statistik
  - BalanceChart: chart garis saldo
  - TransactionsTable: tabel transaksi
  - DashboardSidebar: sidebar navigasi
  - TransactionModal: modal tambah transaksi
  - ProfileEditModal: modal edit profil
-->

<template>
  <div class="dashboard-page">
    <!-- Navbar Global -->
    <Navbar @toggle-sidebar="sidebarOpen = true" />

    <!-- Loading Overlay - muncul pas lagi fetch data -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p class="loading-text">Memuat data...</p>
    </div>



    <!-- Kandang Selector Card -->
    <section class="kandang-selector-card card">
      <label class="selector-label">Pilih Kandang</label>
      <select v-model="selectedKandangId" class="kandang-dropdown" @change="onKandangChange">
        <option v-for="k in kandangList" :key="k._id" :value="k._id">
          {{ k.name }}
        </option>
      </select>
    </section>

    <!-- Blur overlay untuk user yang belum dapat akses investor -->
    <div v-if="isUserRole" class="access-restricted">
      <div class="blur-overlay">
        <!-- Placeholder cards blur -->
        <section class="stats-row blurred">
          <div class="stat-card placeholder">
            <div class="stat-value">Rp. ***</div>
            <div class="stat-label">Masuk</div>
          </div>
          <div class="stat-card placeholder">
            <div class="stat-value">Rp. ***</div>
            <div class="stat-label">Keluar</div>
          </div>
          <div class="stat-card placeholder">
            <div class="stat-value">Rp. ***</div>
            <div class="stat-label">Saldo</div>
          </div>
        </section>
        
        <div class="chart-placeholder blurred">
          <div class="placeholder-text">📊 Chart Perubahan Saldo</div>
        </div>
        
        <div class="table-placeholder blurred">
          <div class="placeholder-text">📋 Daftar Transaksi</div>
        </div>
      </div>
      
      <!-- Request access overlay -->
      <div class="request-access-overlay">
        <div class="request-card">
          <span class="lock-icon">🔒</span>
          <h3>Akses Terbatas</h3>
          <p>Kamu belum memiliki akses untuk melihat data keuangan kandang ini.</p>
          <button 
            class="request-btn" 
            @click="requestInvestorAccess"
            :disabled="requestLoading"
          >
            {{ requestLoading ? 'Mengirim...' : '📩 Minta Akses Investor' }}
          </button>
          <p v-if="requestSent" class="success-msg">✅ Request sudah dikirim ke Head Owner!</p>
        </div>
      </div>
    </div>

    <!-- Data keuangan untuk investor, co_owner, head_owner -->
    <template v-else>
      <!-- Stats Cards - Pemasukan, Pengeluaran, Saldo -->
      <section class="stats-row">
        <StatsCard 
          type="income" 
          :value="dashboard?.totalIncome || 0" 
          label="Masuk" 
        />
        <StatsCard 
          type="expense" 
          :value="dashboard?.totalExpense || 0" 
          label="Keluar" 
        />
        <StatsCard 
          type="balance" 
          :value="dashboard?.balance || 0" 
          label="Saldo"
          :negative="(dashboard?.balance || 0) < 0"
        />
      </section>

      <!-- Balance Chart -->
      <BalanceChart :transactions="transactions" />

      <!-- Transactions Table -->
      <TransactionsTable 
        :transactions="filteredTransactions"
        v-model:filterType="filterType"
        v-model:searchQuery="searchQuery"
        :sortColumn="sortColumn"
        :sortAsc="sortAsc"
        @sort="sortBy"
      />
    </template>

    <!-- Sidebar -->
    <DashboardSidebar 
      :isOpen="sidebarOpen"
      :user="user"
      :currentKandang="currentKandang"
      :canAddTransaction="canEdit"
      :isHeadOwner="isHeadOwner"
      :unreadCount="unreadCount"
      @close="sidebarOpen = false"
      @addTransaction="showAddModal = true; sidebarOpen = false"
      @editProfile="showProfileModal = true; sidebarOpen = false"
      @openNotifications="notificationOpen = true; sidebarOpen = false"
      @logout="logout"
    />

    <!-- Notification Sidebar -->
    <NotificationSidebar 
      :isOpen="notificationOpen"
      @close="notificationOpen = false"
      @update="fetchUnreadCount"
    />

    <!-- Add Transaction Modal -->
    <TransactionModal 
      v-if="showAddModal" 
      @close="showAddModal = false"
      @saved="onTransactionSaved"
    />

    <!-- Profile Edit Modal -->
    <ProfileEditModal
      v-if="showProfileModal"
      @close="showProfileModal = false"
      @saved="onProfileSaved"
    />
  </div>
</template>

<script setup>
/**
 * Script setup - import components dan composable
 * 
 * Semua logic udah dipindahin ke useDashboard composable
 * Jadi di sini tinggal import aja 😁
 */

import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

// Composable buat semua logic dashboard
import { useDashboard } from '../composables/useDashboard'
import { useAuthStore } from '../stores/auth'

// Components
import StatsCard from '../components/dashboard/StatsCard.vue'
import BalanceChart from '../components/dashboard/BalanceChart.vue'
import TransactionsTable from '../components/dashboard/TransactionsTable.vue'
import DashboardSidebar from '../components/dashboard/DashboardSidebar.vue'
import TransactionModal from '../components/TransactionModal.vue'
import ProfileEditModal from '../components/ProfileEditModal.vue'
import Navbar from '../components/dashboard/Navbar.vue'
import NotificationSidebar from '../components/NotificationSidebar.vue'

const API_URL = 'http://localhost:3001/api'
const authStore = useAuthStore()

// State buat request investor
const requestLoading = ref(false)
const requestSent = ref(false)
const kandangRole = ref(null) // Role user di kandang yang dipilih (head_owner/co_owner/investor/null)

// Cek apakah user TIDAK punya akses di kandang ini (bukan member)
// null = tidak ada akses, perlu request
const isUserRole = computed(() => {
  // Jika role global bukan 'user' (head_owner, co_owner, investor), jangan blur
  if (authStore.user && authStore.user.role !== 'user') return false
  
  // Jika di kandang ini ga punya role (null), baru blur
  return kandangRole.value === null
})

// Ambil semua state dan methods dari composable
const {
  // State
  isLoading,
  showAddModal,
  showProfileModal,
  sidebarOpen,
  notificationOpen,
  unreadCount,
  selectedKandangId,
  transactions,
  filterType,
  searchQuery,
  sortColumn,
  sortAsc,
  
  // Computed
  user,
  isHeadOwner,
  canEdit,
  kandangList,
  currentKandang,
  dashboard,
  filteredTransactions,
  
  // Methods
  loadKandangList,
  fetchUnreadCount,
  onKandangChange: originalOnKandangChange,
  onTransactionSaved,
  onProfileSaved,
  sortBy,
  logout
} = useDashboard()

// Fetch role user di kandang tertentu
async function fetchKandangRole(kandangId) {
  if (!kandangId || !authStore.user?._id) {
    kandangRole.value = null
    return
  }
  
  try {
    const res = await axios.get(`${API_URL}/kandang/${kandangId}/user-role?userId=${authStore.user._id}`)
    kandangRole.value = res.data.role
    requestSent.value = false // Reset saat ganti kandang
  } catch (e) {
    console.error('Error fetching kandang role:', e)
    kandangRole.value = null
  }
}

// Override onKandangChange untuk fetch role juga
async function onKandangChange() {
  await originalOnKandangChange()
  await fetchKandangRole(selectedKandangId.value)
}

// Request jadi investor
async function requestInvestorAccess() {
  if (!selectedKandangId.value || !authStore.user?._id) return
  
  requestLoading.value = true
  try {
    await axios.post(`${API_URL}/notifications/request-investor`, {
      userId: authStore.user._id,
      kandangId: selectedKandangId.value
    })
    requestSent.value = true
  } catch (e) {
    const errMsg = e.response?.data?.error || 'Gagal mengirim request'
    alert(errMsg)
  } finally {
    requestLoading.value = false
  }
}

// Load data pas component mounted
onMounted(async () => {
  await loadKandangList()
  // Fetch role untuk kandang pertama
  if (selectedKandangId.value) {
    await fetchKandangRole(selectedKandangId.value)
  }
})
</script>

<style>
/* Import CSS dari file terpisah */
@import '../styles/dashboard.css';

/* Blur overlay untuk akses terbatas */
.access-restricted {
  position: relative;
  margin-left: var(--sidebar-width, 280px);
  padding: 20px;
}

@media (max-width: 768px) {
  .access-restricted {
    margin-left: 0;
  }
}

.blur-overlay {
  filter: blur(8px);
  pointer-events: none;
  user-select: none;
}

.blurred {
  opacity: 0.5;
}

.stats-row.blurred {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card.placeholder {
  flex: 1;
  background: white;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.stat-card.placeholder .stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #94A3B8;
}

.stat-card.placeholder .stat-label {
  font-size: 0.875rem;
  color: #94A3B8;
  margin-top: 4px;
}

.chart-placeholder,
.table-placeholder {
  background: white;
  border-radius: 12px;
  padding: 60px 24px;
  text-align: center;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.placeholder-text {
  font-size: 1.25rem;
  color: #94A3B8;
}

/* Request access overlay */
.request-access-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  width: 90%;
  max-width: 400px;
}

.request-card {
  background: white;
  border-radius: 16px;
  padding: 40px 32px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
}

.lock-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 16px;
}

.request-card h3 {
  margin: 0 0 12px 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.request-card p {
  margin: 0 0 24px 0;
  color: var(--text-secondary);
  line-height: 1.5;
}

.request-btn {
  background: linear-gradient(135deg, var(--primary), #059669);
  color: white;
  border: none;
  padding: 14px 28px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.request-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
}

.request-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.success-msg {
  color: var(--primary) !important;
  font-weight: 500;
  margin-top: 16px !important;
}
</style>
