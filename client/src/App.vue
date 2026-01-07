<template>
  <!-- Gunakan layout wrapper untuk authenticated routes -->
  <AppLayout v-if="isAuthenticated && !isPublicRoute">
    <RouterView />
  </AppLayout>
  
  <!-- Public routes tanpa layout -->
  <RouterView v-else />
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import AppLayout from './components/layout/AppLayout.vue'

const route = useRoute()
const authStore = useAuthStore()

const isAuthenticated = computed(() => !!authStore.user)

// Routes yang ga pake sidebar layout
const publicRoutes = ['landing', 'login', 'register']
const isPublicRoute = computed(() => publicRoutes.includes(route.name))

onMounted(() => {
  authStore.loadUser()
})
</script>

<style>
/* Import Google Font */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
</style>
