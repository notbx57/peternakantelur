import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

const API_URL = 'http://localhost:3001/api'

// Helper to check if ID is a valid Convex ID (not demo ID)
function isValidConvexId(id) {
    // Convex IDs are typically longer strings, demo IDs like 'k1', 'k2' are short
    return id && id.length > 10
}

export const useKandangStore = defineStore('kandang', () => {
    const kandangList = ref([])
    const currentKandang = ref(null)
    const transactions = ref([])
    const dashboard = ref(null)
    const loading = ref(false)
    const error = ref(null)
    const isDemoMode = ref(true) // Start in demo mode

    // Filters
    const filters = ref({
        categoryId: null,
        type: null,
        startDate: null,
        endDate: null,
        search: ''
    })

    async function fetchKandangList(userId) {
        if (!userId || !isValidConvexId(userId)) {
            // Demo mode - use static data
            return
        }

        loading.value = true
        isDemoMode.value = false
        try {
            const res = await axios.get(`${API_URL}/kandang?userId=${userId}`)
            kandangList.value = res.data
        } catch (e) {
            error.value = e.message
        } finally {
            loading.value = false
        }
    }

    function setCurrentKandang(kandang, skipApiCall = false) {
        currentKandang.value = kandang
        localStorage.setItem('currentKandang', JSON.stringify(kandang))

        // Only call API if valid Convex ID and not skipping
        if (!skipApiCall && isValidConvexId(kandang?._id)) {
            isDemoMode.value = false
            fetchTransactions()
            fetchDashboard()
        }
    }

    async function fetchTransactions() {
        if (!currentKandang.value) return
        if (!isValidConvexId(currentKandang.value._id)) {
            // Demo mode - skip API call
            return
        }

        loading.value = true
        try {
            const params = new URLSearchParams()
            if (filters.value.categoryId) params.append('categoryId', filters.value.categoryId)
            if (filters.value.type) params.append('type', filters.value.type)
            if (filters.value.startDate) params.append('startDate', filters.value.startDate)
            if (filters.value.endDate) params.append('endDate', filters.value.endDate)
            if (filters.value.search) params.append('search', filters.value.search)

            const res = await axios.get(`${API_URL}/kandang/${currentKandang.value._id}/transactions?${params}`)
            transactions.value = res.data
        } catch (e) {
            error.value = e.message
        } finally {
            loading.value = false
        }
    }

    async function fetchDashboard() {
        if (!currentKandang.value) return
        if (!isValidConvexId(currentKandang.value._id)) {
            // Demo mode - skip API call
            return
        }

        try {
            const res = await axios.get(`${API_URL}/kandang/${currentKandang.value._id}/dashboard`)
            dashboard.value = res.data
        } catch (e) {
            error.value = e.message
        }
    }

    async function createTransaction(data) {
        if (!isValidConvexId(currentKandang.value?._id)) {
            console.log('Demo mode: transaction not saved to API')
            return
        }

        loading.value = true
        try {
            await axios.post(`${API_URL}/kandang/${currentKandang.value._id}/transactions`, data)
            await fetchTransactions()
            await fetchDashboard()
        } catch (e) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    async function updateTransaction(id, data) {
        if (!isValidConvexId(currentKandang.value?._id)) {
            console.log('Demo mode: transaction not updated')
            return
        }

        loading.value = true
        try {
            await axios.put(`${API_URL}/kandang/${currentKandang.value._id}/transactions/${id}`, data)
            await fetchTransactions()
            await fetchDashboard()
        } catch (e) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    async function deleteTransaction(id) {
        if (!isValidConvexId(currentKandang.value?._id)) {
            console.log('Demo mode: transaction not deleted')
            return
        }

        loading.value = true
        try {
            await axios.delete(`${API_URL}/kandang/${currentKandang.value._id}/transactions/${id}`)
            await fetchTransactions()
            await fetchDashboard()
        } catch (e) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    function loadCurrentKandang() {
        const stored = localStorage.getItem('currentKandang')
        if (stored) {
            currentKandang.value = JSON.parse(stored)
        }
    }

    return {
        kandangList,
        currentKandang,
        transactions,
        dashboard,
        loading,
        error,
        filters,
        isDemoMode,
        fetchKandangList,
        setCurrentKandang,
        fetchTransactions,
        fetchDashboard,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        loadCurrentKandang
    }
})
