<!--
  KandangDetailView.vue - Halaman detail kandang dengan financial dashboard
  
  Sesuai mockup:
  - Breadcrumb: Market >> PT John Doe >> Ayam Pertama
  - Stats cards: Masuk, Keluar, Saldo
  - Perubahan Saldo chart
  - Transaction table dengan filter/search
  - Sidebar: Prediksi Keuangan + Invest button
-->

<template>
  <div class="kandang-detail">
    <!-- Breadcrumb -->
    <div class="breadcrumb">
      <router-link to="/market" class="crumb">Market</router-link>
      <span class="separator">>></span>
      <router-link 
        v-if="marketId" 
        :to="marketHandle ? `/market/@${marketHandle}` : `/market/${marketId}`" 
        class="crumb"
      >
        {{ marketName }}
      </router-link>
      <span class="separator">>></span>
      <span class="crumb current">{{ kandang?.name || 'Loading...' }}</span>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Memuat data kandang...</p>
    </div>

    <template v-else>
      <div class="content-layout">
        <!-- Main Content -->
        <div class="main-content">
          <!-- Stats Cards -->
          <div class="stats-row">
            <div class="stat-card income">
              <div class="stat-icon">💰</div>
              <div class="stat-info">
                <span class="stat-value">{{ formatCurrency(totalIncome) }}</span>
                <span class="stat-label">MASUK</span>
              </div>
            </div>
            <div class="stat-card expense">
              <div class="stat-icon">💸</div>
              <div class="stat-info">
                <span class="stat-value">{{ formatCurrency(totalExpense) }}</span>
                <span class="stat-label">KELUAR</span>
              </div>
            </div>
            <div class="stat-card balance" :class="{ negative: balance < 0 }">
              <div class="stat-icon">💵</div>
              <div class="stat-info">
                <span class="stat-value">{{ formatCurrency(balance) }}</span>
                <span class="stat-label">SALDO</span>
              </div>
            </div>
          </div>

          <!-- Balance Chart -->
          <BalanceChart :transactions="transactions" />

          <!-- Mobile: Statistik Investasi Card (shown only on mobile below chart) -->
          <div class="prediction-card mobile-only">
            <div class="user-role-section" v-if="userRole">
              <span class="label">Status Anda:</span>
              <span class="role-badge" :class="userRole">
                {{ formatRole(userRole) }}
              </span>
            </div>
            <div class="prediction-divider"></div>
            <h3>📊 Statistik Investasi</h3>
            <div class="prediction-item">
              <span class="label">ROI</span>
              <span class="value" :class="{ positive: stats.roi >= 0, negative: stats.roi < 0 }">
                {{ stats.roi >= 0 ? '+' : '' }}{{ stats.roi }}%
              </span>
            </div>
            <div class="prediction-item">
              <span class="label">Total Investasi</span>
              <span class="value">{{ formatCurrency(stats.totalInvestment) }}</span>
            </div>
            <div class="prediction-item">
              <span class="label">Profit</span>
              <span class="value" :class="{ positive: stats.profit >= 0, negative: stats.profit < 0 }">
                {{ formatCurrency(stats.profit) }}
              </span>
            </div>
            <div class="prediction-divider"></div>
            <h3>🔮 Prediksi</h3>
            <div class="prediction-item">
              <span class="label">Avg. Profit/Bulan</span>
              <span class="value">{{ formatCurrency(stats.avgMonthlyProfit) }}</span>
            </div>
            <div class="prediction-item">
              <span class="label">Prediksi ROI/Bulan</span>
              <span class="value" :class="{ positive: stats.predictedMonthlyROI >= 0 }">
                {{ stats.predictedMonthlyROI >= 0 ? '+' : '' }}{{ stats.predictedMonthlyROI }}%
              </span>
            </div>
            <div class="prediction-item" v-if="stats.monthsToBreakEven">
              <span class="label">Break-even</span>
              <span class="value">~{{ stats.monthsToBreakEven }} bulan</span>
            </div>
            <p class="prediction-desc">Berdasarkan data 3 bulan terakhir</p>
            
            <button v-if="canInvest" class="invest-btn mobile-invest-btn" @click="showInvestModal = true">
              Invest 🔥
            </button>
          </div>

          <!-- Transaction Table -->
          <div class="table-section">
            <div class="table-header">
              <h3 class="section-title">📋 Daftar Transaksi</h3>
              <div class="table-filters">
                <select v-model="filterType" class="filter-select">
                  <option value="">Semua Tipe</option>
                  <option value="income">Masuk</option>
                  <option value="expense">Keluar</option>
                </select>
                <input 
                  v-model="searchQuery" 
                  type="text" 
                  class="search-input" 
                  placeholder="🔍 Cari..."
                />
                <button @click="exportToPDF" class="btn-export-pdf" title="Export ke PDF">
                  📄 PDF
                </button>
              </div>
            </div>

            <div class="table-container">
              <table class="transaction-table">
                <thead>
                  <tr>
                    <th>TANGGAL</th>
                    <th>KATEGORI</th>
                    <th>KETERANGAN</th>
                    <th>TIPE</th>
                    <th>JUMLAH</th>
                    <th>STATUS</th>
                    <th v-if="canEdit">AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="tx in filteredTransactions" 
                    :key="tx._id"
                    :class="{ clickable: canEdit, 'anomaly-row': tx.anomaly?.is_anomaly }"
                  >
                    <td>{{ formatDate(tx.date) }}</td>
                    <td>
                      <span class="category-badge">
                        <span class="cat-icon">{{ tx.category?.icon || '📦' }}</span>
                        <span class="cat-name">{{ tx.categoryName || tx.category?.name || 'Lain-lain' }}</span>
                      </span>
                    </td>
                    <td>{{ tx.description }}</td>
                    <td>
                      <span class="type-badge" :class="tx.type">
                        {{ tx.type === 'income' ? 'Masuk' : 'Keluar' }}
                      </span>
                    </td>
                    <td :class="tx.type">
                      {{ tx.type === 'income' ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
                    </td>
                    <td>
                      <span 
                        v-if="tx.anomaly" 
                        class="anomaly-badge" 
                        :class="tx.anomaly.is_anomaly ? 'anomaly' : 'normal'"
                        :title="tx.anomaly.is_anomaly ? tx.anomaly.anomaly_reasons?.join(', ') : 'Normal'"
                      >
                        {{ tx.anomaly.is_anomaly ? '⚠️ Anomali' : '✓ Normal' }}
                      </span>
                      <span v-else class="anomaly-badge loading">...</span>
                    </td>
                    <td v-if="canEdit" class="action-cell">
                      <button 
                        class="btn-edit-tx" 
                        @click.stop="selectTransaction(tx)"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        class="btn-delete-tx" 
                        @click.stop="confirmDeleteTransaction(tx)"
                        title="Hapus"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p v-if="filteredTransactions.length === 0" class="empty-text">
                Belum ada transaksi
              </p>
            </div>
          </div>
        </div>

        <!-- Sidebar: Prediction & Invest -->
        <aside class="prediction-sidebar">
          <div class="prediction-card">
            <div class="user-role-section" v-if="userRole">
              <span class="label">Status Anda:</span>
              <span class="role-badge" :class="userRole">
                {{ formatRole(userRole) }}
              </span>
            </div>
            <div class="prediction-divider"></div>
            <h3>📊 Statistik Investasi</h3>
            <div class="prediction-item">
              <span class="label">ROI</span>
              <span class="value" :class="{ positive: stats.roi >= 0, negative: stats.roi < 0 }">
                {{ stats.roi >= 0 ? '+' : '' }}{{ stats.roi }}%
              </span>
            </div>
            <div class="prediction-item">
              <span class="label">Total Investasi</span>
              <span class="value">{{ formatCurrency(stats.totalInvestment) }}</span>
            </div>
            <div class="prediction-item">
              <span class="label">Profit</span>
              <span class="value" :class="{ positive: stats.profit >= 0, negative: stats.profit < 0 }">
                {{ formatCurrency(stats.profit) }}
              </span>
            </div>
            <div class="prediction-divider"></div>
            <h3>🔮 Prediksi</h3>
            <div class="prediction-item">
              <span class="label">Avg. Profit/Bulan</span>
              <span class="value">{{ formatCurrency(stats.avgMonthlyProfit) }}</span>
            </div>
            <div class="prediction-item">
              <span class="label">Prediksi ROI/Bulan</span>
              <span class="value" :class="{ positive: stats.predictedMonthlyROI >= 0 }">
                {{ stats.predictedMonthlyROI >= 0 ? '+' : '' }}{{ stats.predictedMonthlyROI }}%
              </span>
            </div>
            <div class="prediction-item" v-if="stats.monthsToBreakEven">
              <span class="label">Break-even</span>
              <span class="value">~{{ stats.monthsToBreakEven }} bulan</span>
            </div>
            <p class="prediction-desc">Berdasarkan data 3 bulan terakhir</p>
          </div>

          <button v-if="canInvest" class="invest-btn" @click="showInvestModal = true">
            Invest 🔥
          </button>

          <!-- Tombol untuk owner/co-owner menambah transaksi -->
          <button v-if="canEdit" class="add-transaction-btn" @click="showAddModal = true">
            + Tambah Transaksi
          </button>
        </aside>
      </div>

      <!-- Add Transaction Button (mobile) -->
      <button 
        v-if="canEdit" 
        class="fab-add" 
        @click="showAddModal = true"
      >
        +
      </button>
    </template>

    <!-- Add Transaction Modal -->
    <TransactionModal 
      v-if="showAddModal" 
      @close="showAddModal = false"
      @saved="onTransactionSaved"
    />

    <!-- Edit Transaction Modal -->
    <TransactionModal 
      v-if="editingTx" 
      :transaction="editingTx"
      @close="editingTx = null"
      @saved="onTransactionSaved"
    />

    <!-- Investment Modal -->
    <div v-if="showInvestModal" class="modal-overlay" @click.self="showInvestModal = false">
      <div class="modal-content">
        <h2>💰 Investasi Kandang</h2>
        <form @submit.prevent="handleInvest">
          <div class="form-group">
            <label>Jumlah Investasi</label>
            <input 
              v-model.number="investAmount" 
              type="number" 
              min="100000"
              max="1000000000"
              step="100000"
              required 
              placeholder="Rp 1.000.000"
              @input="clampInvestAmount"
            />
          </div>
          <div class="prediction-preview">
            <div class="prediction-row">
              <span>Estimasi ROI:</span>
              <strong :class="{ positive: stats.predictedMonthlyROI >= 0 }">
                {{ stats.predictedMonthlyROI >= 0 ? '+' : '' }}{{ stats.predictedMonthlyROI }}%/bulan
              </strong>
            </div>
            <div class="prediction-row">
              <span>Prediksi profit/bulan:</span>
              <strong :class="{ positive: estimatedMonthlyProfit >= 0 }">
                {{ formatCurrency(estimatedMonthlyProfit) }}
              </strong>
            </div>
            <div class="prediction-row" v-if="estimatedBreakEven">
              <span>Break-even:</span>
              <strong>~{{ estimatedBreakEven }} bulan</strong>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="showInvestModal = false">
              Batal
            </button>
            <button type="submit" class="btn-invest" :disabled="saving || !investAmount">
              {{ saving ? 'Memproses...' : 'Investasi Sekarang' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal-content delete-modal">
        <h2>🗑️ Hapus Transaksi</h2>
        <p class="delete-warning">
          Apakah Anda yakin ingin menghapus transaksi ini?
        </p>
        <div class="delete-preview" v-if="deletingTx">
          <div class="preview-row">
            <span class="label">Tanggal:</span>
            <span>{{ formatDate(deletingTx.date) }}</span>
          </div>
          <div class="preview-row">
            <span class="label">Keterangan:</span>
            <span>{{ deletingTx.description }}</span>
          </div>
          <div class="preview-row">
            <span class="label">Jumlah:</span>
            <span :class="deletingTx.type">
              {{ deletingTx.type === 'income' ? '+' : '-' }}{{ formatCurrency(deletingTx.amount) }}
            </span>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-cancel" @click="showDeleteModal = false">
            Batal
          </button>
          <button type="button" class="btn-delete" @click="handleDeleteTransaction" :disabled="saving">
            {{ saving ? 'Menghapus...' : 'Ya, Hapus' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <div v-if="showToast" :class="['toast', toastType]">
      <span class="toast-icon">{{ toastType === 'success' ? '✓' : '✕' }}</span>
      <span>{{ toastMessage }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useKandangStore } from '@/stores/kandang'
import { useAuthStore } from '@/stores/auth'
import TransactionModal from '@/components/TransactionModal.vue'
import BalanceChart from '@/components/dashboard/BalanceChart.vue'
import axios, { API_URL } from '@/api/axios'
import gsap from 'gsap'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const route = useRoute()
const router = useRouter()
const kandangStore = useKandangStore()
const authStore = useAuthStore()

// State
const loading = ref(true)
const showAddModal = ref(false)
const showInvestModal = ref(false)
const showDeleteModal = ref(false)
const editingTx = ref(null)
const deletingTx = ref(null)
const saving = ref(false)

const filterType = ref('')
const searchQuery = ref('')
const investAmount = ref(1000000)

// Toast State
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

const marketId = ref(null)
const marketHandle = ref('')
const marketName = ref('')
const transactions = ref([])
const userRole = ref('')

// Computed
const kandang = computed(() => kandangStore.currentKandang)
// Owner dan Co-owner bisa edit transaksi
const canEdit = computed(() => userRole.value === 'head_owner' || userRole.value === 'co_owner')
// Hanya user yang BUKAN owner/co-owner yang bisa invest (investor atau belum punya role)
const canInvest = computed(() => userRole.value !== 'head_owner' && userRole.value !== 'co_owner')

const totalIncome = computed(() => {
  return transactions.value
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
})

const totalExpense = computed(() => {
  return transactions.value
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
})

const balance = computed(() => totalIncome.value - totalExpense.value)

const filteredTransactions = computed(() => {
  let result = transactions.value
  
  if (filterType.value) {
    result = result.filter(t => t.type === filterType.value)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(t => 
      t.description?.toLowerCase().includes(query)
    )
  }
  
  return result.sort((a, b) => b.date - a.date)
})

// Stats from backend
const stats = ref({
  roi: 0,
  totalInvestment: 0,
  profit: 0,
  avgMonthlyProfit: 0,
  predictedMonthlyROI: 0,
  monthsToBreakEven: null,
  transactionCount: 0
})

// Real-time investment calculations
// Profit dihitung berdasarkan ROI bulanan kandang
const estimatedMonthlyProfit = computed(() => {
  if (!investAmount.value || stats.value.predictedMonthlyROI === 0) return 0
  // Profit = Investasi × (ROI% / 100)
  return Math.round(investAmount.value * (stats.value.predictedMonthlyROI / 100))
})

const estimatedBreakEven = computed(() => {
  if (!investAmount.value || estimatedMonthlyProfit.value <= 0) return null
  const months = Math.ceil(investAmount.value / estimatedMonthlyProfit.value)
  // Limit tampilan ke max 999 bulan biar ga aneh
  return months > 999 ? '999+' : months
})

// Clamp input value to max
function clampInvestAmount() {
  if (investAmount.value > 1000000000) {
    investAmount.value = 1000000000
  }
  if (investAmount.value < 0) {
    investAmount.value = 0
  }
}

// Methods
async function loadKandangData() {
  loading.value = true
  try {
    const kandangId = route.params.id
    
    // Load kandang info
    try {
      const res = await axios.get(`${API_URL}/api/kandang/${kandangId}`)
      kandangStore.currentKandang = res.data
      marketId.value = res.data.marketId
      
      // Load market name
      if (marketId.value) {
        const marketRes = await axios.get(`${API_URL}/api/markets/${marketId.value}`)
        marketName.value = marketRes.data.name
        marketHandle.value = marketRes.data.handle
        
        // Load user role in this market
        if (authStore.user?._id) {
          const roleRes = await axios.get(`${API_URL}/api/markets/${marketId.value}/role?userId=${authStore.user._id}`)
          userRole.value = roleRes.data.role
        }
      }
    } catch (e) {
      console.error('Error loading kandang:', e)
    }

    // Load transactions
    try {
      const txRes = await axios.get(`${API_URL}/api/transactions/kandang/${kandangId}`)
      transactions.value = txRes.data
      
      // Check anomaly for each transaction
      await checkAnomalies()
    } catch (e) {
      console.error('Error loading transactions:', e)
      transactions.value = []
    }

    // Load stats (ROI, prediction, etc.)
    try {
      const statsRes = await axios.get(`${API_URL}/api/kandang/${kandangId}/stats`)
      stats.value = statsRes.data
    } catch (e) {
      console.error('Error loading stats:', e)
    }
    
  } catch (e) {
    console.error('Error:', e)
  } finally {
    const wasLoading = loading.value
    loading.value = false
    if (wasLoading) {
      animateEntry()
    }
  }
}

function animateEntry() {
  nextTick(() => {
    // Check if elements exist
    const tl = gsap.timeline({ defaults: { ease: 'back.out(1.7)', duration: 0.6 } })
    
    // Animate Stats
    tl.fromTo('.stat-card', 
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1 }
    )
    
    // Animate Chart & Table
    tl.fromTo(['.chart-card', '.table-section'],
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.1 },
      '-=0.4'
    )
    
    // Animate Sidebar
    tl.fromTo('.prediction-sidebar > *',
      { x: 30, opacity: 0 },
      { x: 0, opacity: 1, stagger: 0.1 },
      '-=0.4'
    )
  })
}

function selectTransaction(tx) {
  editingTx.value = tx
}

async function onTransactionSaved() {
  showAddModal.value = false
  editingTx.value = null
  await loadKandangData()
}

function confirmDeleteTransaction(tx) {
  deletingTx.value = tx
  showDeleteModal.value = true
}

async function handleDeleteTransaction() {
  if (!deletingTx.value || !kandang.value?._id) return
  
  saving.value = true
  try {
    await axios.delete(`${API_URL}/api/transactions/kandang/${kandang.value._id}/${deletingTx.value._id}`)
    showDeleteModal.value = false
    deletingTx.value = null
    showNotification('Transaksi berhasil dihapus', 'success')
    await loadKandangData()
  } catch (e) {
    console.error('Error deleting transaction:', e)
    showNotification(e.response?.data?.error || 'Gagal menghapus transaksi', 'error')
  } finally {
    saving.value = false
  }
}

function showNotification(msg, type = 'success') {
  toastMessage.value = msg
  toastType.value = type
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

function formatRole(role) {
  const roles = {
    head_owner: 'Owner 👑',
    co_owner: 'Co-Owner 🤝',
    investor: 'Investor 💰',
    user: 'Visitor 👀'
  }
  return roles[role] || 'User'
}

async function handleInvest() {
  saving.value = true
  try {
    // FIX: Endpoint harus /investors dan payload investmentAmount
    await axios.post(`${API_URL}/api/kandang/${route.params.id}/investors`, {
      userId: authStore.user?._id,
      investmentAmount: investAmount.value
    })
    
    showInvestModal.value = false
    showNotification('Investasi sukses! Mengalihkan ke Portfolio...', 'success')
    
    // Redirect ke portfolio setelah delay singkat
    setTimeout(() => {
      router.push('/portfolio')
    }, 1500)
    
  } catch (e) {
    console.error('Error investing:', e)
    showNotification(e.response?.data?.error || 'Investasi gagal', 'error')
  } finally {
    saving.value = false
  }
}

function formatCurrency(val) {
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val)
}

function formatCurrencyShort(val) {
  if (Math.abs(val) >= 1000000) {
    return 'Rp ' + (val / 1000000).toFixed(1) + ' jt'
  }
  if (Math.abs(val) >= 1000) {
    return 'Rp ' + (val / 1000).toFixed(0) + ' rb'
  }
  return 'Rp ' + val
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short',
    year: 'numeric'
  })
}

// Anomaly Detection - cek transaksi yang mencurigakan
async function checkAnomalies() {
  if (transactions.value.length === 0) return
  
  try {
    // Prepare data untuk batch check
    const txData = transactions.value.map(tx => ({
      _id: tx._id,
      amount: tx.amount,
      type: tx.type,
      category: tx.category?.name || 'Lain-lain',
      date: tx.date,
      description: tx.description
    }))
    
    const res = await axios.post(`${API_URL}/api/anomaly/batch`, { 
      transactions: txData 
    })
    
    // Update setiap transaksi dengan hasil anomaly detection
    if (res.data && res.data.transactions) {
      res.data.transactions.forEach(result => {
        const tx = transactions.value.find(t => t._id === result._id)
        if (tx) {
          tx.anomaly = result.anomaly
        }
      })
    }
  } catch (e) {
    console.error('Error checking anomalies:', e)
    // Fallback: set semua transaksi jadi tidak diketahui statusnya
    transactions.value.forEach(tx => {
      tx.anomaly = { is_anomaly: false, confidence: 0, anomaly_reasons: [] }
    })
  }
}

// PDF Export
function exportToPDF() {
  if (filteredTransactions.value.length === 0) {
    showNotification('Tidak ada data transaksi untuk diexport', 'error')
    return
  }

  const doc = new jsPDF()
  
  // -- Header Formal --
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text(marketName.value || 'PETERNAKAN TELUR', 105, 20, { align: 'center' })
  
  doc.setFontSize(14)
  doc.text(`Laporan Transaksi: ${kandang.value?.name || 'Kandang'}`, 105, 30, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Tanggal Export: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 105, 38, { align: 'center' })
  
  doc.setLineWidth(0.5)
  doc.line(20, 45, 190, 45)

  // -- Summary Stats --
  doc.setFontSize(10)
  doc.text(`Total Pemasukan: ${formatCurrency(totalIncome.value)}`, 14, 55)
  doc.text(`Total Pengeluaran: ${formatCurrency(totalExpense.value)}`, 14, 60)
  doc.text(`Saldo Akhir: ${formatCurrency(balance.value)}`, 14, 65)
  
  // -- Transaction Table --
  const tableColumn = ["Tanggal", "Kategori", "Keterangan", "Tipe", "Jumlah", "Status"]
  const tableRows = []

  filteredTransactions.value.forEach(tx => {
    const txData = [
      formatDate(tx.date),
      tx.categoryName || tx.category?.name || 'Lain-lain',
      tx.description,
      tx.type === 'income' ? 'Masuk' : 'Keluar',
      formatCurrency(tx.amount),
      tx.anomaly?.is_anomaly ? 'Anomali' : 'Normal'
    ]
    tableRows.push(txData)
  })

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 75,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 30 }, // Tanggal
      4: { halign: 'right' } // Jumlah rata kanan
    }
  })

  // Footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text('Dicetak otomatis oleh Sistem Peternakan Telur', 105, 285, { align: 'center' })
    doc.text(`Halaman ${i} dari ${pageCount}`, 190, 285, { align: 'right' })
  }

  // Save Name
  const cleanKandangName = (kandang.value?.name || 'kandang').replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const dateStr = new Date().toISOString().split('T')[0]
  doc.save(`Laporan_Transaksi_${cleanKandangName}_${dateStr}.pdf`)
  
  showNotification('Laporan PDF berhasil diunduh', 'success')
}

// Lifecycle
onMounted(() => {
  authStore.loadUser()
  loadKandangData()
})

watch(() => route.params.id, () => {
  if (route.params.id) {
    loadKandangData()
  }
})
</script>

<style scoped>
.kandang-detail {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  font-size: 0.9rem;
  flex-wrap: wrap;
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

/* Content Layout */
.content-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 24px;
  width: 100%;
  min-width: 0;
}

@media (max-width: 900px) {
  .content-layout {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
  overflow: hidden;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.btn-export-pdf {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #fff;
  border: 1px solid #d1d5db;
  color: #374151;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  height: 42px; /* Match filter select height if possible, or adjust as needed */
  font-size: 0.9rem;
}

.btn-export-pdf:hover {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}

/* Mobile-only: hidden on desktop, shown on mobile */
.mobile-only {
  display: none;
}

@media (max-width: 900px) {
  .mobile-only {
    display: block;
  }
  
  .prediction-sidebar {
    display: none;
  }
}

@media (max-width: 600px) {
  .stats-row {
    grid-template-columns: 1fr;
    width: 100%;
  }
  
  .stat-card {
    justify-content: center;
  }
}

.stat-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-left: 4px solid;
}

.stat-card.income {
  border-color: #4ADE80;
}

.stat-card.expense {
  border-color: #F97316;
}

.stat-card.balance {
  border-color: #3B82F6;
}

.stat-card.balance.negative {
  border-color: #EF4444;
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1A1A1A;
}

.stat-label {
  font-size: 0.7rem;
  color: #666666;
  letter-spacing: 0.05em;
}

/* Chart */
.chart-section {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 20px;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 16px 0;
}

.chart-container {
  height: 200px;
}

/* Table */
.table-section {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.table-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-select,
.search-input {
  padding: 8px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 0.85rem;
}

.search-input {
  width: 160px;
}

@media (max-width: 600px) {
  .table-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .table-filters {
    width: 100%;
  }
  
  .filter-select,
  .search-input {
    flex: 1;
    min-width: 0;
  }
  
  .search-input {
    width: auto;
  }
  
  .btn-export-pdf {
    flex: 1;
    justify-content: center;
  }
}

.table-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 0 -12px;
  padding: 0 12px;
}

.transaction-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;
}

.transaction-table th,
.transaction-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #E5E5E5;
  white-space: nowrap;
}

.transaction-table td:nth-child(3) {
  white-space: normal;
  min-width: 150px;
  max-width: 250px;
}

.transaction-table th {
  font-size: 0.75rem;
  font-weight: 600;
  color: #666666;
  letter-spacing: 0.05em;
}

.transaction-table tr.clickable {
  cursor: pointer;
}

.transaction-table tr.clickable:hover {
  background: #F9FAFB;
}

.type-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.type-badge.income {
  background: #D1FAE5;
  color: #059669;
}

.type-badge.expense {
  background: #FEE2E2;
  color: #DC2626;
}

td.income {
  color: #059669;
  font-weight: 500;
}

td.expense {
  color: #DC2626;
  font-weight: 500;
}

/* Category Badge */
.category-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #F3F4F6;
  border-radius: 6px;
  font-size: 0.8rem;
}

.category-badge .cat-icon {
  font-size: 1rem;
}

.category-badge .cat-name {
  color: #374151;
  font-weight: 500;
}

.empty-text {
  text-align: center;
  color: #666666;
  padding: 40px;
}

/* Action Cell */
.action-cell {
  white-space: nowrap;
}

.btn-edit-tx,
.btn-delete-tx {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-edit-tx:hover {
  background: #EFF6FF;
}

.btn-delete-tx:hover {
  background: #FEE2E2;
}

/* Anomaly Status Badges */
.anomaly-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

.anomaly-badge.normal {
  background: #D1FAE5;
  color: #059669;
}

.anomaly-badge.anomaly {
  background: #FEF3C7;
  color: #D97706;
}

.anomaly-badge.loading {
  background: #E5E7EB;
  color: #6B7280;
}

.anomaly-row {
  background: #FFFBEB !important;
}

.anomaly-row:hover {
  background: #FEF3C7 !important;
}

/* Delete Modal */
.delete-modal {
  max-width: 400px;
}

.delete-warning {
  color: #666666;
  margin-bottom: 16px;
}

.delete-preview {
  background: #F9FAFB;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
}

.preview-row .label {
  color: #666666;
  font-size: 0.9rem;
}

.btn-delete {
  padding: 12px 24px;
  background: #EF4444;
  border: none;
  border-radius: 8px;
  color: #FFFFFF;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-delete:hover {
  background: #DC2626;
}

.btn-delete:disabled {
  background: #FCA5A5;
  cursor: not-allowed;
}

/* Prediction Sidebar */
.prediction-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

@media (max-width: 900px) {
  .prediction-sidebar {
    width: 100%;
  }
}

.prediction-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
}

.prediction-card h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.prediction-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.prediction-item .label {
  color: #666666;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.prediction-item .value {
  font-weight: 600;
  font-size: 0.9rem;
  text-align: right;
  word-break: break-word;
}

.prediction-item .value.positive {
  color: #059669;
}

.prediction-desc {
  color: #999999;
  font-size: 0.85rem;
  margin-top: 12px;
}

.mobile-invest-btn {
  margin-top: 16px;
  width: 100%;
}

/* User Role Section */
.user-role-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.user-role-section .label {
  font-size: 0.85rem;
  color: #666666;
}

.role-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  text-transform: uppercase;
}

.role-badge.head_owner {
  background: #FEF3C7;
  color: #92400E;
}

.role-badge.investor {
  background: #DCFCE7;
  color: #166534;
}

.role-badge.user {
  background: #F3F4F6;
  color: #4B5563;
}

.prediction-divider {
  height: 1px;
  background: #F3F4F6;
  margin: 12px 0;
}

.invest-btn {
  padding: 16px;
  background: linear-gradient(135deg, #4ADE80, #22C55E);
  border: none;
  border-radius: 12px;
  color: #FFFFFF;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.invest-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.4);
}

/* Add Transaction Button */
.add-transaction-btn {
  padding: 14px;
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  border: none;
  border-radius: 12px;
  color: #FFFFFF;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.add-transaction-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* FAB */
.fab-add {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #4ADE80;
  border: none;
  color: #FFFFFF;
  font-size: 2rem;
  font-weight: 300;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  display: none;
}

@media (max-width: 768px) {
  .fab-add {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .prediction-sidebar .add-transaction-btn {
    display: none;
  }
  
  .breadcrumb {
    font-size: 0.8rem;
  }
  
  .stat-card {
    padding: 12px;
  }
  
  .stat-value {
    font-size: 0.95rem;
  }
  
  .table-section {
    padding: 12px;
    border-radius: 8px;
  }
  
  .section-title {
    font-size: 0.9rem;
  }
}

/* Modal */
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
  margin-bottom: 6px;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 1rem;
}

.prediction-preview {
  background: #F8FAFC;
  padding: 16px;
  border-radius: 10px;
  margin-bottom: 16px;
}

.prediction-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.prediction-row:last-child {
  margin-bottom: 0;
}

.prediction-row span {
  color: #64748B;
}

.prediction-row strong {
  color: #1E293B;
}

.prediction-row strong.positive {
  color: #059669;
}

/* Toast Notification */
.toast {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 24px;
  border-radius: 12px;
  font-weight: 500;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  z-index: 3000;
  animation: slideUp 0.3s ease;
}

.toast.success {
  background: #D1FAE5;
  color: #059669;
  border: 1px solid #10B981;
}

.toast.error {
  background: #FEE2E2;
  color: #DC2626;
  border: 1px solid #EF4444;
}

.toast-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: currentColor; /* Use text color */
  color: white;
  border-radius: 50%;
  font-size: 0.875rem;
  font-weight: 700;
}

.toast.success .toast-icon {
  background: #10B981;
}

.toast.error .toast-icon {
  background: #EF4444;
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

.prediction-preview p {
  margin: 0 0 4px 0;
  font-size: 0.9rem;
  color: #059669;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.btn-cancel {
  flex: 1;
  padding: 12px;
  background: #FFFFFF;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  cursor: pointer;
}

.btn-invest {
  flex: 1;
  padding: 12px;
  background: linear-gradient(135deg, #4ADE80, #22C55E);
  border: none;
  border-radius: 8px;
  color: #FFFFFF;
  font-weight: 600;
  cursor: pointer;
}

.btn-invest:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-invest,
.btn-cancel {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-invest {
  background: #10B981;
  color: white;
  border: none;
}

.btn-invest:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
}

.btn-invest:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  background: white;
  color: #64748B;
  border: 1px solid #E2E8F0;
}

.btn-cancel:hover {
  background: #F8FAFC;
  color: #475569;
}

@media (max-width: 480px) {
  .modal-actions {
    flex-direction: column;
  }
}
</style>
