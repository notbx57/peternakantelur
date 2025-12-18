import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
    const user = ref(null)
    const loading = ref(false)

    const isAuthenticated = computed(() => !!user.value)
    const isHeadOwner = computed(() => user.value?.role === 'head_owner')
    const isCoOwner = computed(() => user.value?.role === 'co_owner')
    const isInvestor = computed(() => user.value?.role === 'investor')
    const isUser = computed(() => user.value?.role === 'user') // Role default user baru
    const canEdit = computed(() => isHeadOwner.value || isCoOwner.value)

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
    }

    return {
        user,
        loading,
        isAuthenticated,
        isHeadOwner,
        isCoOwner,
        isInvestor,
        isUser,
        canEdit,
        setUser,
        loadUser,
        logout
    }
})
