import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Auth store - untuk user authentication
// ROLE TIDAK ADA DI LEVEL USER LAGI!
// Role (head_owner, co_owner, investor) hanya ada di context market/kandang

export const useAuthStore = defineStore('auth', () => {
    const user = ref(null)
    const loading = ref(false)

    // Basic auth checks
    const isAuthenticated = computed(() => !!user.value)

    function setUser(userData) {
        user.value = userData
        if (userData) {
            localStorage.setItem('user', JSON.stringify(userData))
        } else {
            localStorage.removeItem('user')
        }
    }

    function loadUser() {
        const stored = localStorage.getItem('user')
        if (stored) {
            user.value = JSON.parse(stored)
        }
    }

    async function logout() {
        user.value = null
        localStorage.removeItem('user')
        localStorage.removeItem('auth_token')
    }

    return {
        user,
        loading,
        isAuthenticated,
        setUser,
        loadUser,
        logout
    }
})
