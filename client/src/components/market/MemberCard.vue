<!--
  MemberCard.vue - Card untuk tampilkan info member di grid
  
  Sesuai mockup: avatar, nama, dan role badge
-->

<template>
  <div class="member-card" @click="$emit('click')">
    <!-- Avatar -->
    <div class="member-avatar">
      <img 
        v-if="member.avatar" 
        :src="member.avatar" 
        :alt="member.name"
      />
      <span v-else class="avatar-placeholder">{{ initial }}</span>
    </div>

    <!-- Info -->
    <div class="member-info">
      <h4 class="member-name">
        {{ member.name }}
        <span v-if="isYou" class="you-badge">(You)</span>
      </h4>
      <div class="role-badge" :class="roleClass">
        {{ roleLabel }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  member: {
    type: Object,
    required: true
  },
  role: {
    type: String, // 'head_owner', 'co_owner', 'investor'
    default: 'investor'
  },
  isYou: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])

const initial = computed(() => {
  return props.member.name?.charAt(0)?.toUpperCase() || '?'
})

const roleLabel = computed(() => {
  switch (props.role) {
    case 'head_owner': return 'Head Owner'
    case 'co_owner': return 'Co owner'
    case 'investor': return 'Investor'
    default: return props.role
  }
})

const roleClass = computed(() => {
  return props.role.replace('_', '-')
})
</script>

<style scoped>
.member-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #E5E5E5;
}

.member-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.member-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #E5E5E5;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 600;
  color: #666666;
}

.member-info {
  text-align: center;
}

.member-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 4px 0;
}

.you-badge {
  font-weight: 400;
  color: #666666;
}

.role-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.role-badge.head-owner {
  background: #FEF3C7;
  color: #D97706;
}

.role-badge.co-owner {
  background: #DBEAFE;
  color: #2563EB;
}

.role-badge.investor {
  background: #D1FAE5;
  color: #059669;
}
</style>
