<!--
  MarketView.vue - Halaman browse semua market (global list)
  
  Fitur:
  - Grid view semua market yang aktif
  - Search market by name
  - Click card -> masuk ke detail market
  
  Sesuai mockup TikTok SPA style
-->

<template>
  <div class="market-view">
    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">Markets</h1>
    </div>

    <!-- Search & Sort Bar -->
    <div class="filter-section">
      <input 
        type="text" 
        v-model="searchQuery" 
        class="search-input" 
        placeholder="🔍 Cari market..."
      />
      <select v-model="sortBy" class="sort-select">
        <option value="newest">Terbaru</option>
        <option value="name-asc">Nama (A-Z)</option>
        <option value="name-desc">Nama (Z-A)</option>
        <option value="kandang-desc">Kandang Terbanyak</option>
        <option value="kandang-asc">Kandang Tersedikit</option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Memuat markets...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredMarkets.length === 0" class="empty-state">
      <span class="empty-icon">🏪</span>
      <h3>Belum ada market</h3>
      <p>Jadilah yang pertama membuat market!</p>
      <router-link to="/market/create" class="btn-primary">
        ➕ Buat Market
      </router-link>
    </div>

    <!-- Market Grid -->
    <div v-else class="market-grid">
      <MarketCard 
        v-for="market in filteredMarkets" 
        :key="market._id"
        :market="market"
        :kandangCount="market.kandangCount || 0"
        :produkCount="market.productCount || 0"
        @click="goToMarket(market)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMarketStore } from '@/stores/market'
import MarketCard from '@/components/market/MarketCard.vue'
import gsap from 'gsap'

const router = useRouter()
const marketStore = useMarketStore()

const searchQuery = ref('')
const sortBy = ref('newest')

const loading = computed(() => marketStore.loading)
const markets = computed(() => marketStore.markets)

const filteredMarkets = computed(() => {
  let result = markets.value
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(m => 
      m.name.toLowerCase().includes(query) ||
      m.description?.toLowerCase().includes(query)
    )
  }
  
  // Sort by selected option
  result = [...result].sort((a, b) => {
    switch (sortBy.value) {
      case 'name-asc':
        return a.name.localeCompare(b.name)
      case 'name-desc':
        return b.name.localeCompare(a.name)
      case 'kandang-desc':
        return (b.kandangCount || 0) - (a.kandangCount || 0)
      case 'kandang-asc':
        return (a.kandangCount || 0) - (b.kandangCount || 0)
      case 'newest':
      default:
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    }
  })
  
  return result
})

onMounted(() => {
  marketStore.fetchMarkets()
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
  gsap.from('.filter-section', {
    y: 10,
    opacity: 0,
    duration: 0.6,
    delay: 0.2,
    ease: 'power2.out'
  })
}

function animateGrid() {
  nextTick(() => {
    const cards = document.querySelectorAll('.market-grid > *')
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
    animateGrid()
  }
})

watch(filteredMarkets, () => {
  if (!loading.value) {
    animateGrid()
  }
})

function goToMarket(market) {
  if (market.handle) {
    router.push(`/market/@${market.handle}`)
  } else {
    router.push(`/market/${market._id}`)
  }
}
</script>

<style scoped>
.market-view {
  max-width: 900px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
}

/* Filter Section */
.filter-section {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
  padding: 12px 16px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 0.95rem;
  background: #FFFFFF;
}

.search-input:focus {
  outline: none;
  border-color: #4ADE80;
}

.sort-select {
  padding: 12px 16px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 0.95rem;
  background: #FFFFFF;
  cursor: pointer;
  min-width: 160px;
}

.sort-select:focus {
  outline: none;
  border-color: #4ADE80;
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

.btn-primary:hover {
  background: #22C55E;
}

/* Market Grid */
.market-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 600px) {
  .market-grid {
    grid-template-columns: 1fr;
  }
}
</style>
