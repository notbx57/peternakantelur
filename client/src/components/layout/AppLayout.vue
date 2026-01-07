<!--
  AppLayout.vue - Main layout wrapper dengan persistent sidebar
  
  Light theme matching existing dashboard design
-->

<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <AppSidebar 
      :isOpen="sidebarOpen"
      @close="sidebarOpen = false"
      @logout="handleLogout"
      @editProfile="showProfileModal = true"
    />

    <!-- Mobile Header -->
    <header class="mobile-header">
      <button class="hamburger-btn" @click="sidebarOpen = true">
        ☰
      </button>
      <div class="header-logo">
        <span class="logo-icon">🐔</span>
        <span class="logo-text">Endogvest</span>
      </div>
      <div class="header-spacer"></div>
    </header>

    <!-- Main Content -->
    <main class="app-content">
      <slot></slot>
    </main>

    <!-- Profile Edit Modal -->
    <ProfileEditModal
      v-if="showProfileModal"
      @close="showProfileModal = false"
      @saved="showProfileModal = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppSidebar from './AppSidebar.vue'
import ProfileEditModal from '@/components/ProfileEditModal.vue'

const router = useRouter()
const authStore = useAuthStore()

const sidebarOpen = ref(false)
const showProfileModal = ref(false)

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 50%, #F0FDFA 100%);
}

/* Main Content */
.app-content {
  margin-left: 220px;
  min-height: 100vh;
  padding: 24px;
}

/* Mobile Header */
.mobile-header {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: #FFFFFF;
  border-bottom: 1px solid #E2E8F0;
  padding: 0 16px;
  align-items: center;
  justify-content: space-between;
  z-index: 90;
}

.hamburger-btn {
  background: none;
  border: none;
  color: #374151;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 8px;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 1.25rem;
}

.logo-text {
  color: #059669;
  font-weight: 700;
  font-size: 1.1rem;
}

.header-spacer {
  width: 40px;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .app-content {
    margin-left: 0;
    padding: 16px;
    padding-top: 72px;
  }

  .mobile-header {
    display: flex;
  }
}
</style>
