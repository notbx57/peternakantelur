<!--
  KandangCard.vue - Card untuk tampilkan info kandang di grid
  
  Light theme dengan unified styling
-->

<template>
  <div class="kandang-card" @click="$emit('click')">
    <!-- Image -->
    <div class="kandang-image">
      <img 
        v-if="kandang.avatar" 
        :src="kandang.avatar" 
        :alt="kandang.name"
      />
      <div v-else class="image-placeholder">
        🐔
      </div>
    </div>

    <!-- Info -->
    <div class="kandang-info">
      <h4 class="kandang-name">{{ kandang.name }}</h4>
      <div class="roi-indicator" :class="roiClass">
        ROI : {{ roiDisplay }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  kandang: {
    type: Object,
    required: true
  },
  roi: {
    type: Number,
    default: 0
  }
})

defineEmits(['click'])

const roiDisplay = computed(() => {
  const val = props.roi
  const sign = val >= 0 ? '+' : ''
  return `${sign}${val.toFixed(1)}%`
})

const roiClass = computed(() => {
  return props.roi >= 0 ? 'positive' : 'negative'
})
</script>

<style scoped>
.kandang-card {
  background: #FFFFFF;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #E2E8F0;
}

.kandang-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #059669;
}

.kandang-image {
  width: 100%;
  height: 120px;
  overflow: hidden;
}

.kandang-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #ECFDF5, #D1FAE5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
}

.kandang-info {
  padding: 12px 14px;
}

.kandang-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1F2937;
  margin: 0 0 6px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.roi-indicator {
  font-size: 0.8rem;
  font-weight: 600;
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
}

.roi-indicator.positive {
  background: #ECFDF5;
  color: #059669;
}

.roi-indicator.negative {
  background: #FEF2F2;
  color: #DC2626;
}
</style>
