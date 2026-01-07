<!--
  ProductCard.vue - Card untuk tampilkan info produk di grid
  
  Sesuai mockup: gambar produk, nama, harga, dan trend arrow
-->

<template>
  <div class="product-card" @click="$emit('click')">
    <!-- Image -->
    <div class="product-image">
      <img 
        v-if="product.image" 
        :src="product.image" 
        :alt="product.name"
      />
      <div v-else class="image-placeholder">
        🥚
      </div>
    </div>

    <!-- Info -->
    <div class="product-info">
      <h4 class="product-name">{{ product.name }}</h4>
      <div class="price-row">
        <span class="price">{{ formattedPrice }}</span>
        <span class="trend" :class="trendClass">{{ trendIcon }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  product: {
    type: Object,
    required: true
  },
  trend: {
    type: String, // 'up', 'down', 'stable'
    default: 'stable'
  }
})

defineEmits(['click'])

const formattedPrice = computed(() => {
  const price = props.product.price || 0
  return `Rp. ${price.toLocaleString('id-ID')}`
})

const trendIcon = computed(() => {
  switch (props.trend) {
    case 'up': return '↗'
    case 'down': return '↘'
    default: return ''
  }
})

const trendClass = computed(() => {
  switch (props.trend) {
    case 'up': return 'up'
    case 'down': return 'down'
    default: return ''
  }
})
</script>

<style scoped>
.product-card {
  background: #FFFFFF;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #E5E5E5;
}

.product-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.product-image {
  width: 100%;
  height: 100px;
  overflow: hidden;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #FCD34D, #F59E0B);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
}

.product-info {
  padding: 10px 12px;
}

.product-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 4px 0;
  text-align: center;
}

.price-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.price {
  font-size: 0.8rem;
  color: #666666;
}

.trend {
  font-size: 0.9rem;
  font-weight: bold;
}

.trend.up {
  color: #DC2626;
}

.trend.down {
  color: #059669;
}
</style>
