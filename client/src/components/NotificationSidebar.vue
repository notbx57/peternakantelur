<template>
  <div class="notification-panel" :class="{ open: isOpen }">
    <div class="notification-header">
      <h3>🔔 Notifikasi</h3>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <div v-if="loading" class="loading-state">
      <p>Memuat notifikasi...</p>
    </div>

    <div v-else-if="notifications.length === 0" class="empty-state">
      <p>Tidak ada notifikasi</p>
    </div>

    <div v-else class="notification-list">
      <div 
        v-for="notif in notifications" 
        :key="notif._id" 
        class="notification-item"
        :class="{ unread: !notif.isRead }"
      >
        <div class="notification-icon">
          <span v-if="notif.type === 'investor_request'">📥</span>
          <span v-else-if="notif.type === 'request_accepted'">✅</span>
          <span v-else-if="notif.type === 'request_rejected'">❌</span>
        </div>
        
        <div class="notification-content">
          <p class="notification-message">{{ notif.message }}</p>
          <span class="notification-time">{{ formatTime(notif.createdAt) }}</span>
          
          <!-- Action buttons for request (head owner) -->
          <div v-if="notif.type === 'investor_request' && !notif.isRead" class="notification-actions">
            <button 
              class="btn btn-sm btn-success" 
              @click="acceptRequest(notif)"
              :disabled="actionLoading"
            >
              ✓ Accept
            </button>
            <button 
              class="btn btn-sm btn-danger" 
              @click="rejectRequest(notif)"
              :disabled="actionLoading"
            >
              ✕ Reject
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="notifications.length > 0" class="notification-footer">
      <button class="btn-text" @click="markAllRead">
        Tandai semua sudah dibaca
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import axios from 'axios'

const API_URL = 'http://localhost:3001/api'

const props = defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close', 'update'])

const authStore = useAuthStore()
const notifications = ref([])
const loading = ref(false)
const actionLoading = ref(false)

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    fetchNotifications()
  }
})

onMounted(() => {
  if (props.isOpen) {
    fetchNotifications()
  }
})

async function fetchNotifications() {
  if (!authStore.user?._id) return
  
  loading.value = true
  try {
    const res = await axios.get(`${API_URL}/notifications?userId=${authStore.user._id}`)
    notifications.value = res.data
  } catch (e) {
    console.error('Error fetching notifications:', e)
  } finally {
    loading.value = false
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return 'Baru saja'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

async function acceptRequest(notif) {
  actionLoading.value = true
  try {
    await axios.post(`${API_URL}/notifications/${notif._id}/accept`, {
      headOwnerId: authStore.user._id
    })
    
    // Reload notifications
    await fetchNotifications()
    emit('update')
  } catch (e) {
    console.error('Error accepting request:', e)
    alert(e.response?.data?.error || 'Gagal menerima request')
  } finally {
    actionLoading.value = false
  }
}

async function rejectRequest(notif) {
  actionLoading.value = true
  try {
    await axios.post(`${API_URL}/notifications/${notif._id}/reject`, {
      headOwnerId: authStore.user._id
    })
    
    // Reload notifications
    await fetchNotifications()
    emit('update')
  } catch (e) {
    console.error('Error rejecting request:', e)
    alert(e.response?.data?.error || 'Gagal menolak request')
  } finally {
    actionLoading.value = false
  }
}

async function markAllRead() {
  try {
    await axios.patch(`${API_URL}/notifications/read-all`, {
      userId: authStore.user._id
    })
    await fetchNotifications()
    emit('update')
  } catch (e) {
    console.error('Error marking all read:', e)
  }
}
</script>

<style scoped>
.notification-panel {
  position: fixed;
  top: 0;
  right: -400px;
  width: 380px;
  height: 100vh;
  background: white;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  z-index: 1001;
  transition: right 0.3s ease;
  display: flex;
  flex-direction: column;
}

.notification-panel.open {
  right: 0;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #E2E8F0;
}

.notification-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.loading-state,
.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.notification-list {
  flex: 1;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #F1F5F9;
  transition: background 0.2s;
}

.notification-item:hover {
  background: #F8FAFC;
}

.notification-item.unread {
  background: #EFF6FF;
}

.notification-icon {
  font-size: 1.5rem;
}

.notification-content {
  flex: 1;
}

.notification-message {
  margin: 0 0 4px 0;
  font-size: 0.875rem;
  color: var(--text-primary);
  line-height: 1.4;
}

.notification-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.notification-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.75rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.btn-success {
  background: #22C55E;
  color: white;
}

.btn-success:hover {
  background: #16A34A;
}

.btn-danger {
  background: #EF4444;
  color: white;
}

.btn-danger:hover {
  background: #DC2626;
}

.notification-footer {
  padding: 12px 20px;
  border-top: 1px solid #E2E8F0;
  text-align: center;
}

.btn-text {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-text:hover {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .notification-panel {
    width: 100%;
    right: -100%;
  }
}
</style>
