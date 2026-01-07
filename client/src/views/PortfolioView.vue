<!--
  PortfolioView.vue - Halaman portfolio investor
  
  Menampilkan daftar kandang yang sudah di-invest oleh user
-->

<template>
  <div class="portfolio-view">
    <h1 class="page-title">📊 Portfolio Investasi</h1>
    <p class="subtitle">Kelola investasi kandang kamu</p>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Memuat portfolio...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="investments.length === 0" class="empty-state">
      <span class="empty-icon">💼</span>
      <h3>Belum ada investasi</h3>
      <p>Mulai investasi di kandang favoritmu!</p>
      <router-link to="/market" class="btn-explore">
        🔍 Jelajahi Market
      </router-link>
    </div>

    <!-- Investment List -->
    <!-- Portfolio Groups (By Market) -->
    <div v-else class="portfolio-content">
      <!-- Summary Card -->
      <div class="summary-card">
        <h3>Ringkasan Portfolio</h3>
        <div class="summary-row">
          <span>Total Investasi</span>
          <span class="total">{{ formatCurrency(totalInvestment) }}</span>
        </div>
        <div class="summary-row">
          <span>Jumlah Kandang</span>
          <span>{{ investments.length }}</span>
        </div>
      </div>

      <div v-for="group in groupedInvestments" :key="group.market?._id || 'unknown'" class="market-group">
        <div class="market-group-header">
          <div class="header-left">
             <h2 class="market-name">
                <router-link v-if="group.market?.handle" :to="`/market/@${group.market.handle}`" class="market-link">
                  {{ group.market?.name || 'Unknown Market' }}
                </router-link>
                <span v-else>{{ group.market?.name || 'Unknown Market' }}</span>
             </h2>
             <span class="market-handle" v-if="group.market?.handle">@{{ group.market.handle }}</span>
          </div>
          <div class="group-total">
            Total: {{ formatCurrency(group.total) }}
          </div>
        </div>

        <div class="investment-grid">
          <div 
            v-for="inv in group.investments" 
            :key="inv._id"
            class="investment-card"
            @click="goToKandang(inv)"
          >
            <div class="inv-header">
              <h3 class="inv-name">{{ inv.kandang?.name || 'Kandang' }}</h3>
              <span class="inv-date">{{ formatDate(inv.investedAt) }}</span>
            </div>
            <div class="inv-details">
              <div class="inv-item">
                <span class="label">Investasi</span>
                <span class="value">{{ formatCurrency(inv.investmentAmount) }}</span>
              </div>
              <!-- ROI placeholder/future usage -->
              <div class="inv-item">
                <span class="label">Status</span>
                <span class="value positive">Aktif</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import axios, { API_URL } from '@/api/axios'
import gsap from 'gsap'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const investments = ref([])

const totalInvestment = computed(() => {
  return investments.value.reduce((sum, inv) => sum + (inv.investmentAmount || 0), 0)
})

const groupedInvestments = computed(() => {
  const groups = {}
  investments.value.forEach(inv => {
    const mId = inv.market?._id || 'unknown'
    if (!groups[mId]) {
      groups[mId] = { 
        market: inv.market, 
        investments: [], 
        total: 0 
      }
    }
    groups[mId].investments.push(inv)
    groups[mId].total += (inv.investmentAmount || 0)
  })
  return Object.values(groups)
})

async function loadPortfolio() {
  loading.value = true
  try {
    const userId = authStore.user?._id
    if (!userId) return

    const res = await axios.get(`${API_URL}/api/kandang/investments`, {
      params: { userId }
    })
    investments.value = res.data
  } catch (e) {
    console.error('Error loading portfolio:', e)
    investments.value = []
  } finally {
    loading.value = false
  }
}

function goToKandang(inv) {
  const kandangId = inv.kandangId || inv.kandang?._id
  if (inv.market?.handle) {
    router.push(`/market/@${inv.market.handle}/kandang/${kandangId}`)
  } else {
    router.push(`/kandang/${kandangId}`)
  }
}

function formatCurrency(val) {
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val || 0)
}

function formatDate(ts) {
  if (!ts) return '-'
  return new Date(ts).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short',
    year: 'numeric'
  })
}

onMounted(() => {
  authStore.loadUser()
  loadPortfolio()
  animateHeader()
})

// Animations
function animateHeader() {
  gsap.from('.page-title', {
    y: -20,
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out'
  })
  gsap.from('.subtitle', {
    y: -10,
    opacity: 0,
    duration: 0.6,
    delay: 0.1,
    ease: 'power2.out'
  })
}

function animateContent() {
  nextTick(() => {
    // Target both summary card and market groups
    const items = document.querySelectorAll('.portfolio-content > *')
    if (items.length > 0) {
      gsap.fromTo(items, 
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out', clearProps: 'all' }
      )
    }
  })
}

// Watchers
watch(loading, (newVal) => {
  if (!newVal) {
    animateContent()
  }
})

watch(investments, () => {
  if (!loading.value) {
    animateContent()
  }
})
</script>

<style scoped>
.portfolio-view {
  max-width: 700px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 8px 0;
}

.subtitle {
  color: #666666;
  margin: 0 0 24px 0;
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

.btn-explore {
  display: inline-block;
  padding: 12px 24px;
  background: #4ADE80;
  color: #000000;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
}

.btn-explore:hover {
  background: #22C55E;
}

/* Investment List */
.investment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.investment-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.investment-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.inv-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.inv-name {
  font-size: 1rem;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.inv-market {
  font-size: 0.8rem;
  color: #666666;
  background: #F5F5F5;
  padding: 4px 10px;
  border-radius: 4px;
}

.inv-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.inv-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.inv-item .label {
  font-size: 0.75rem;
  color: #666666;
}

.inv-item .value {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1A1A1A;
}

.inv-item .value.positive {
  color: #059669;
}

.inv-item .value.negative {
  color: #DC2626;
}

/* Grouping Styles */
.portfolio-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.market-group {
  background: #F8FAFC;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #E2E8F0;
}

.market-group-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #E2E8F0;
}

.market-name {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

.market-link {
  color: #1A1A1A;
  text-decoration: none;
}
.market-link:hover {
  color: #059669;
}

.market-handle {
  font-size: 0.85rem;
  color: #64748B;
}

.group-total {
  background: #DCFCE7;
  color: #166534;
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
}

.investment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}


/* Summary Card */
.summary-card {
  background: linear-gradient(135deg, #4ADE80, #22C55E);
  border-radius: 12px;
  padding: 20px;
  color: #FFFFFF;
}

.summary-card h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.summary-row .total {
  font-size: 1.2rem;
  font-weight: 700;
}
</style>
