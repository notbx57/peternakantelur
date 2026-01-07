<!--
  MarketCard.vue - Card untuk tampilkan info market di grid
  
  Light theme dengan white background dan subtle borders
-->

<template>
  <div class="market-card" @click="$emit('click')">
    <!-- Market Header -->
    <div class="market-header">
      <div class="market-logo">
        <img v-if="market.logo" :src="market.logo" :alt="market.name" />
        <span v-else>{{ market.name?.charAt(0) }}</span>
      </div>
      <div class="market-info">
        <h3 class="market-name">{{ market.name }}</h3>
        <p class="market-handle-card">@{{ market.handle || 'unknown' }}</p>
        <div class="market-stats">
          <span class="stat">{{ kandangCount }} Kandang</span>
          <span class="stat">{{ produkCount }} Produk</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  market: {
    type: Object,
    required: true
  },
  kandangCount: {
    type: Number,
    default: 0
  },
  produkCount: {
    type: Number,
    default: 0
  }
})

defineEmits(['click'])
</script>

<style scoped>
.market-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #E2E8F0;
}

.market-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #059669;
}

.market-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.market-logo {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: linear-gradient(135deg, #059669, #10B981);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  font-weight: 700;
  font-size: 1.25rem;
  overflow: hidden;
}

.market-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.market-info {
  flex: 1;
}

.market-name {
  font-size: 1rem;
  font-weight: 600;
  color: #1F2937;
  color: #1F2937;
  margin: 0 0 2px 0;
}

.market-handle-card {
  font-size: 0.85rem;
  color: #6B7280;
  margin: 0 0 8px 0;
}

.market-stats {
  display: flex;
  gap: 12px;
}

.stat {
  font-size: 0.8rem;
  color: #6B7280;
}
</style>
