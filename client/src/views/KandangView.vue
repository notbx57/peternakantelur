<template>
  <div class="kandang-layout">
    <!-- Navbar -->
    <nav class="navbar">
      <router-link to="/dashboard" class="back-btn">← Dashboard</router-link>
      <h2>{{ currentKandang?.name || 'Transaksi' }}</h2>
      <div></div>
    </nav>

    <!-- Filters -->
    <div class="filters-bar">
      <select v-model="filters.type" class="select" @change="applyFilters">
        <option value="">Semua</option>
        <option value="income">Masuk</option>
        <option value="expense">Keluar</option>
      </select>
      <input 
        type="text" 
        v-model="searchQuery" 
        class="input search-input" 
        placeholder="🔍 Cari..."
        @input="debounceSearch"
      />
    </div>

    <!-- Main Content -->
    <main class="page">
      <!-- Transaction List -->
      <div class="card">
        <div v-if="loading" class="loading-state">Memuat...</div>
        
        <div v-else-if="transactions.length" class="transaction-list">
          <div v-for="tx in transactions" :key="tx._id" class="transaction-item" @click="onTransactionClick(tx)">
            <div class="transaction-icon" :style="{ background: (tx.category?.color || '#94A3B8') + '20' }">
              {{ tx.category?.icon || '📦' }}
            </div>
            <div class="transaction-info">
              <div class="transaction-desc">{{ tx.description }}</div>
              <div class="transaction-date">{{ formatDate(tx.date) }} • {{ tx.category?.name || 'Lain-lain' }}</div>
            </div>
            <div :class="['transaction-amount', tx.type]">
              {{ tx.type === 'income' ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <p>Belum ada transaksi</p>
        </div>
      </div>
    </main>

    <!-- Bottom Nav -->
    <nav class="bottom-nav">
      <router-link to="/dashboard" class="nav-item">
        <span class="nav-icon">🏠</span>
        <span>Dashboard</span>
      </router-link>
      <router-link :to="`/kandang/${currentKandang?._id}`" class="nav-item active">
        <span class="nav-icon">📋</span>
        <span>Transaksi</span>
      </router-link>
      <button v-if="canEdit" class="nav-item add-btn" @click="showAddModal = true">
        <span class="nav-icon">➕</span>
      </button>
      <router-link v-if="isHeadOwner && currentKandang" :to="`/kandang/${currentKandang._id}/members`" class="nav-item">
        <span class="nav-icon">👥</span>
        <span>Anggota</span>
      </router-link>
    </nav>

    <!-- Modals -->
    <TransactionModal 
      v-if="showAddModal" 
      @close="showAddModal = false"
      @saved="onSaved"
    />
    
    <TransactionModal 
      v-if="editingTx" 
      :transaction="editingTx"
      @close="editingTx = null"
      @saved="onSaved"
    />

    <!-- Action Sheet for edit/delete -->
    <div v-if="selectedTx && canEdit" class="action-sheet-overlay" @click="selectedTx = null">
      <div class="action-sheet" @click.stop>
        <button class="action-item" @click="editTransaction">✏️ Edit</button>
        <button class="action-item danger" @click="deleteTransaction">🗑️ Hapus</button>
        <button class="action-item cancel" @click="selectedTx = null">Batal</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useKandangStore } from '../stores/kandang'
import TransactionModal from '../components/TransactionModal.vue'

const route = useRoute()
const authStore = useAuthStore()
const kandangStore = useKandangStore()

const showAddModal = ref(false)
const editingTx = ref(null)
const selectedTx = ref(null)
const searchQuery = ref('')

const canEdit = computed(() => authStore.canEdit)
const isHeadOwner = computed(() => authStore.isHeadOwner)
const currentKandang = computed(() => kandangStore.currentKandang)
const transactions = computed(() => kandangStore.transactions)
const loading = computed(() => kandangStore.loading)
const filters = computed(() => kandangStore.filters)

let searchTimeout = null

onMounted(() => {
  authStore.loadUser()
  kandangStore.loadCurrentKandang()
  
  // Load demo transactions
  kandangStore.transactions = [
    { _id: '1', description: 'Pembelian pakan 2 ton @7.300', amount: 14600000, type: 'expense', date: Date.now(), category: { icon: '🌾', name: 'Pakan', color: '#F59E0B' } },
    { _id: '2', description: 'Upah vaksin GUMBORO 4 orang', amount: 400000, type: 'expense', date: Date.now() - 86400000, category: { icon: '💊', name: 'Obat & Vaksin', color: '#EF4444' } },
    { _id: '3', description: 'Pembelian 108 gas elpiji', amount: 1056000, type: 'expense', date: Date.now() - 172800000, category: { icon: '🔥', name: 'Gas Elpiji', color: '#F97316' } },
    { _id: '4', description: 'DP pembayaran pullet KEDUA', amount: 150000000, type: 'income', date: Date.now() - 259200000, category: { icon: '💰', name: 'Investasi', color: '#22C55E' } },
    { _id: '5', description: 'Pembayaran pullet 4.500 ekor', amount: 56952000, type: 'expense', date: Date.now() - 345600000, category: { icon: '🐣', name: 'Pullet/DOC', color: '#FBBF24' } },
    { _id: '6', description: 'Gaji Rudi', amount: 2500000, type: 'expense', date: Date.now() - 432000000, category: { icon: '👷', name: 'Gaji Karyawan', color: '#8B5CF6' } },
  ]
})

function debounceSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    filters.value.search = searchQuery.value
    applyFilters()
  }, 300)
}

function applyFilters() {
  kandangStore.fetchTransactions()
}

function onTransactionClick(tx) {
  if (canEdit.value) {
    selectedTx.value = tx
  }
}

function editTransaction() {
  editingTx.value = selectedTx.value
  selectedTx.value = null
}

async function deleteTransaction() {
  if (confirm('Hapus transaksi ini?')) {
    try {
      await kandangStore.deleteTransaction(selectedTx.value._id)
    } catch (e) {
      console.error(e)
    }
  }
  selectedTx.value = null
}

function onSaved() {
  showAddModal.value = false
  editingTx.value = null
}

function formatCurrency(val) {
  if (val >= 1000000) {
    return 'Rp ' + (val / 1000000).toFixed(1) + ' jt'
  }
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}
</script>

<style scoped>
.kandang-layout {
  min-height: 100vh;
  background: var(--bg-primary);
}

.back-btn {
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
}

.filters-bar {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #E2E8F0;
}

.search-input {
  flex: 1;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.add-btn {
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 50%;
  width: 56px;
  height: 56px;
  margin-top: -20px;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
}

.action-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  z-index: 200;
}

.action-sheet {
  background: white;
  width: 100%;
  border-radius: 16px 16px 0 0;
  padding: 8px;
}

.action-item {
  display: block;
  width: 100%;
  padding: 16px;
  text-align: center;
  border: none;
  background: none;
  font-size: 1rem;
  cursor: pointer;
  border-radius: 8px;
}

.action-item:hover {
  background: #F8FAFC;
}

.action-item.danger {
  color: var(--danger);
}

.action-item.cancel {
  color: var(--text-secondary);
  border-top: 1px solid #E2E8F0;
  margin-top: 8px;
}
</style>
