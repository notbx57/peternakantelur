<!--
  AppSidebar.vue - Light theme sidebar navigation
  
  Matching the existing dashboard design:
  - White/light background
  - Green accent for active items and CTA button
  - User profile section with avatar
  - Red/coral "Keluar" button
-->

<template>
  <aside 
    class="app-sidebar" 
    :class="{ 'sidebar-open': isOpen }"
  >
    <!-- Logo -->
    <div class="sidebar-logo">
      <span class="logo-icon">🐔</span>
      <span class="logo-text">Endogvest</span>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <router-link to="/market" class="nav-item" active-class="active" @click="$emit('close')">
        <span class="nav-icon">🏪</span>
        <span class="nav-label">Market</span>
      </router-link>

      <router-link to="/market/create" class="nav-item create-btn" @click="$emit('close')">
        <span class="nav-icon">✨</span>
        <span class="nav-label">Create Market+</span>
      </router-link>

      <router-link to="/market/my" class="nav-item" active-class="active" @click="$emit('close')">
        <span class="nav-icon">🏠</span>
        <span class="nav-label">Your Market</span>
      </router-link>

      <router-link to="/portfolio" class="nav-item" active-class="active" @click="$emit('close')">
        <span class="nav-icon">💼</span>
        <span class="nav-label">Portfolio</span>
      </router-link>
    </nav>

    <!-- User Section -->
    <div class="sidebar-user">
      <div class="user-info" @click="$emit('editProfile')">
        <div class="user-avatar">
          <img v-if="userAvatar" :src="userAvatar" :alt="userName" />
          <span v-else>{{ userInitial }}</span>
        </div>
        <div class="user-details">
          <span class="user-name">{{ userName }}</span>
          <span class="user-email">{{ userEmail }}</span>
        </div>
      </div>

      <button class="logout-btn" @click="$emit('logout')">
        Keluar
      </button>
    </div>

    <!-- Mobile Overlay -->
    <div 
      v-if="isOpen" 
      class="sidebar-overlay" 
      @click="$emit('close')"
    ></div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

defineEmits(['close', 'logout', 'editProfile'])

const authStore = useAuthStore()

const userName = computed(() => authStore.user?.name || 'User')
const userEmail = computed(() => authStore.user?.email || '')
const userAvatar = computed(() => authStore.user?.avatar || null)
const userInitial = computed(() => userName.value.charAt(0).toUpperCase())
</script>

<style scoped>
.app-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 220px;
  height: 100vh;
  background: #FFFFFF;
  border-right: 1px solid #E2E8F0;
  display: flex;
  flex-direction: column;
  z-index: 100;
  transition: transform 0.3s ease;
}

/* Logo */
.sidebar-logo {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 1.5rem;
}

.logo-text {
  color: #059669;
  font-size: 1.25rem;
  font-weight: 700;
}

/* Navigation */
.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  color: #374151;
  text-decoration: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-item:hover {
  background: #F3F4F6;
}

.nav-item.active {
  background: #ECFDF5;
  color: #059669;
}

.nav-icon {
  font-size: 1.1rem;
}

/* Create Button */
.nav-item.create-btn {
  background: #059669;
  color: #FFFFFF;
  margin: 8px 0;
}

.nav-item.create-btn:hover {
  background: #047857;
}

/* User Section */
.sidebar-user {
  padding: 16px;
  border-top: 1px solid #E2E8F0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: #F9FAFB;
  cursor: pointer;
  margin-bottom: 12px;
  transition: background 0.2s;
}

.user-info:hover {
  background: #F3F4F6;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #059669, #10B981);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  font-weight: 600;
  font-size: 1rem;
  overflow: hidden;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: #1F2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 0.75rem;
  color: #6B7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  width: 100%;
  padding: 12px;
  background: #EF4444;
  border: none;
  border-radius: 8px;
  color: #FFFFFF;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #DC2626;
}

/* Mobile Overlay */
.sidebar-overlay {
  display: none;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .app-sidebar {
    transform: translateX(-100%);
  }

  .app-sidebar.sidebar-open {
    transform: translateX(0);
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 220px;
    width: 100vw;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: -1;
  }
}
</style>
