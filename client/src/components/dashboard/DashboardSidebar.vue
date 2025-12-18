<!--
  DashboardSidebar.vue - Sidebar navigasi dashboard
  
  Fitur:
  - Slide-in dari kiri
  - Menu navigasi (dashboard, tambah transaksi, anggota)
  - User info dengan avatar
  - Tombol logout
  
  Props:
  - isOpen: boolean buat control buka/tutup
  - user: object user yang login
  - currentKandang: object kandang yang dipilih
  - canAddTransaction: boolean permission
  - isHeadOwner: boolean permission
  
  Emits:
  - close: dipanggil pas sidebar ditutup
  - addTransaction: dipanggil pas klik tambah transaksi
  - editProfile: dipanggil pas klik user section
  - logout: dipanggil pas klik logout
-->

<template>
  <!-- Overlay belakang sidebar -->
  <div 
    v-if="isOpen" 
    class="sidebar-overlay" 
    @click="$emit('close')"
  ></div>
  
  <!-- Sidebar panel -->
  <aside :class="['sidebar', { open: isOpen }]">
    <div class="sidebar-header">
      <div class="brand">
        <span class="brand-icon">🐔</span>
        <span class="brand-name">Peternakan</span>
      </div>
      <button class="close-sidebar" @click="$emit('close')">✕</button>
    </div>
    
    <nav class="sidebar-nav">
      <!-- Menu Dashboard -->
      <router-link to="/dashboard" class="sidebar-item active" @click="$emit('close')">
        <span class="sidebar-icon">📊</span>
        <span>Dashboard</span>
      </router-link>
      
      <!-- Tambah Transaksi -->
      <button 
        v-if="canAddTransaction" 
        class="sidebar-item"
        @click="$emit('addTransaction')"
      >
        <span class="sidebar-icon">➕</span>
        <span>Tambah Transaksi</span>
      </button>
      
      <!-- Anggota Kandang (khusus head owner) -->
      <router-link 
        v-if="isHeadOwner && currentKandang" 
        :to="`/kandang/${currentKandang._id}/members`" 
        class="sidebar-item"
        @click="$emit('close')"
      >
        <span class="sidebar-icon">👥</span>
        <span>Anggota Kandang</span>
      </router-link>
      
      <!-- Notifikasi -->
      <button class="sidebar-item" @click="$emit('openNotifications')">
        <span class="sidebar-icon">🔔</span>
        <span>Notifikasi</span>
        <span v-if="unreadCount > 0" class="notification-badge">{{ unreadCount }}</span>
      </button>
      
      <div class="sidebar-divider"></div>
      
      <!-- User Section - klik buat edit profil -->
      <div class="sidebar-user" @click="$emit('editProfile')">
        <div 
          class="user-avatar" 
          :style="avatarStyle"
        >
          <span v-if="!user?.avatar">{{ user?.name?.charAt(0) || '?' }}</span>
        </div>
        <div class="user-info">
          <div class="user-name">{{ user?.name || 'User' }}</div>
          <div class="user-role">{{ formatRole(user?.role) }}</div>
        </div>
      </div>
      
      <!-- Tombol Logout -->
      <button class="logout-btn" @click="$emit('logout')">
        Keluar
      </button>
    </nav>
  </aside>
</template>

<script setup>
import { computed } from 'vue'

// Emits
defineEmits(['close', 'addTransaction', 'editProfile', 'logout', 'openNotifications'])

// Props tambahan buat notifikasi
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  user: {
    type: Object,
    default: null
  },
  currentKandang: {
    type: Object,
    default: null
  },
  canAddTransaction: {
    type: Boolean,
    default: false
  },
  isHeadOwner: {
    type: Boolean,
    default: false
  },
  unreadCount: {
    type: Number,
    default: 0
  }
})

// Style buat avatar - pake background image kalo ada
const avatarStyle = computed(() => {
  if (props.user?.avatar) {
    return {
      backgroundImage: `url(${props.user.avatar})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }
  }
  return {}
})

// Format role biar enak dibaca
function formatRole(role) {
  const roles = {
    head_owner: 'Head Owner',
    co_owner: 'Co Owner',
    investor: 'Investor',
    user: 'User'
  }
  return roles[role] || role || 'Guest'
}
</script>

<style scoped>
/* Overlay gelap belakang sidebar (Mobile Only) */
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.3);
  z-index: 1001;
}

@media (min-width: 769px) {
  .sidebar-overlay {
    display: none !important; /* Gak butuh overlay di desktop */
  }
}


/* Ensure buttons inherit font family */
button {
  font-family: inherit;
}


/* Sidebar panel */
.sidebar {
  position: fixed;
  top: 0;
  left: -280px;
  width: 280px;
  height: 100vh;
  background: white;
  z-index: 1002;
  box-shadow: 4px 0 20px rgba(0,0,0,0.1);
  transition: left 0.3s ease;
  display: flex;
  flex-direction: column;
}

.sidebar.open {
  left: 0;
}

/* Desktop Sidebar: Always Visible */
@media (min-width: 769px) {
  .sidebar {
    left: 0 !important; /* Force show */
    top: 0; /* Full height, no navbar */
    height: 100vh;
    z-index: 899;
    box-shadow: 2px 0 10px rgba(0,0,0,0.05);
  }
}


/* Header sidebar */
.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #E2E8F0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-icon {
  font-size: 2rem;
}

.brand-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary);
}

.close-sidebar {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px;
}

.close-sidebar:hover {
  color: var(--danger);
}

@media (min-width: 769px) {
  .close-sidebar {
    display: none; /* Hide close button on desktop */
  }
}


/* Navigation */
.sidebar-nav {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  color: var(--text-primary);
  text-decoration: none;
  border-radius: 10px;
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: background 0.2s;
}

.sidebar-item:hover {
  background: #F1F5F9;
}

.sidebar-item.active {
  background: #D1FAE5;
  color: var(--primary);
}

.sidebar-icon {
  font-size: 1.25rem;
}

.sidebar-divider {
  height: 1px;
  background: #E2E8F0;
  margin: 16px 0;
}

/* User section */
.sidebar-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #F8FAFC;
  border-radius: 10px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.sidebar-user:hover {
  background: #E2E8F0;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.25rem;
}

.user-info {
  flex: 1;
}

.user-name {
  font-weight: 600;
}

.user-role {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: capitalize;
}

/* Logout button */
.logout-btn {
  width: 100%;
  margin-top: auto;
  padding: 16px;
  background: var(--danger);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}

.logout-btn:hover {
  background: #DC2626;
  transform: scale(1.02);
}

/* Notification badge */
.notification-badge {
  margin-left: auto;
  background: #EF4444;
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}
</style>
