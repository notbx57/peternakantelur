<!--
  AddCard.vue - Reusable "+ Tambah" card
  
  Light theme dengan unified styling
-->

<template>
  <div class="add-card" @click="$emit('click')">
    <span class="add-icon">+</span>
    <span class="add-label">{{ label }}</span>
  </div>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    default: 'Tambah'
  }
})

defineEmits(['click'])
</script>

<style scoped>
.add-card {
  background: #FFFFFF;
  border: 2px dashed #CBD5E1;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 150px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-card:hover {
  border-color: #059669;
  background: #ECFDF5;
}

.add-icon {
  font-size: 2rem;
  color: #9CA3AF;
  font-weight: 300;
  line-height: 1;
}

.add-card:hover .add-icon {
  color: #059669;
}

.add-label {
  font-size: 0.9rem;
  color: #6B7280;
  font-weight: 500;
}

.add-card:hover .add-label {
  color: #059669;
}
</style>
