/**
 * useDashboard.js - Composable buat logic dashboard
 * 
 * Ini file buat ngatur semua logic dashboard kek:
 * - Load data kandang
 * - Fetch dashboard stats
 * - Animasi pake GSAP
 * - Format currency dan tanggal
 * 
 * Biar DashboardView ga keberatan nampung semua logic sendiri 😅
 */

import { ref, computed, nextTick } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useKandangStore } from '../stores/kandang'
import gsap from 'gsap'

export function useDashboard() {
    // Ambil store
    const authStore = useAuthStore()
    const kandangStore = useKandangStore()

    // State buat UI
    const isLoading = ref(false)
    const showAddModal = ref(false)
    const showProfileModal = ref(false)
    const sidebarOpen = ref(false)
    const notificationOpen = ref(false) // State buat notification panel
    const unreadCount = ref(0) // Jumlah notifikasi unread
    const selectedKandangId = ref('')
    const transactions = ref([])

    // State buat filter & sort tabel
    const filterType = ref('')
    const searchQuery = ref('')
    const sortColumn = ref('date')
    const sortAsc = ref(false)

    // Computed dari store - biar reactive
    const user = computed(() => authStore.user)
    const isHeadOwner = computed(() => authStore.isHeadOwner)
    const canEdit = computed(() => authStore.canEdit)
    const kandangList = computed(() => kandangStore.kandangList)
    const currentKandang = computed(() => kandangStore.currentKandang)
    const dashboard = computed(() => kandangStore.dashboard)

    // Transaksi yang udah difilter & disort
    const filteredTransactions = computed(() => {
        let result = [...transactions.value]

        // Filter berdasarkan tipe (income/expense)
        if (filterType.value) {
            result = result.filter(tx => tx.type === filterType.value)
        }

        // Filter berdasarkan search query
        if (searchQuery.value) {
            const search = searchQuery.value.toLowerCase()
            result = result.filter(tx => tx.description.toLowerCase().includes(search))
        }

        // Sorting - bisa ascending atau descending
        result.sort((a, b) => {
            let aVal = a[sortColumn.value]
            let bVal = b[sortColumn.value]
            if (typeof aVal === 'string') aVal = aVal.toLowerCase()
            if (typeof bVal === 'string') bVal = bVal.toLowerCase()
            if (sortAsc.value) {
                return aVal > bVal ? 1 : -1
            } else {
                return aVal < bVal ? 1 : -1
            }
        })

        return result
    })

    // Load daftar kandang pas pertama kali
    async function loadKandangList() {
        isLoading.value = true
        try {
            const userId = authStore.user?._id
            const url = userId
                ? `http://localhost:3001/api/kandang/public?userId=${userId}`
                : 'http://localhost:3001/api/kandang/public'

            const response = await fetch(url)
            const list = await response.json()

            if (list && list.length > 0) {
                kandangStore.kandangList = list
                // Pake kandang pertama kalo belum ada yang dipilih
                if (!selectedKandangId.value) {
                    selectedKandangId.value = list[0]._id
                }
                await loadDashboardData(selectedKandangId.value)
            }

            // Load notification count kalo login
            if (userId) {
                await fetchUnreadCount()
            }
        } catch (e) {
            console.error('Gagal load kandang:', e)
        } finally {
            isLoading.value = false
        }
    }

    // Fetch jumlah notifikasi unread
    async function fetchUnreadCount() {
        if (!authStore.user?._id) return
        try {
            const res = await fetch(`http://localhost:3001/api/notifications/unread-count?userId=${authStore.user._id}`)
            const data = await res.json()
            unreadCount.value = data.count || 0
        } catch (e) {
            console.error('Gagal fetch unread count:', e)
        }
    }

    // Load data dashboard sama transaksi
    async function loadDashboardData(kandangId) {
        isLoading.value = true
        try {
            // Fetch dashboard stats
            const dashRes = await fetch(`http://localhost:3001/api/dashboard/${kandangId}`)
            const dashData = await dashRes.json()
            kandangStore.dashboard = dashData
            kandangStore.currentKandang = kandangStore.kandangList.find(k => k._id === kandangId)

            // Fetch transaksi
            const txRes = await fetch(`http://localhost:3001/api/transactions/kandang/${kandangId}`)
            const txData = await txRes.json()
            transactions.value = txData

            // Jalanin animasi setelah data masuk
            await nextTick()
            animateContent()
        } catch (e) {
            console.error('Gagal load dashboard:', e)
        } finally {
            isLoading.value = false
        }
    }

    // Dipanggil pas user ganti kandang di dropdown
    async function onKandangChange() {
        if (selectedKandangId.value) {
            // Fade out dulu kontennya
            gsap.to('.stats-row, .chart-card, .table-card', {
                opacity: 0,
                y: 20,
                duration: 0.2,
                ease: 'power2.in'
            })

            await loadDashboardData(selectedKandangId.value)
        }
    }

    // Animasi GSAP buat konten dashboard - bikin keliatan smooth 😎
    function animateContent() {
        // Reset dulu visibilitynya
        gsap.set('.stats-row, .chart-card, .table-card', { opacity: 1, y: 0 })

        // Animasi stat cards - masuk satu per satu
        gsap.fromTo('.stat-card',
            { opacity: 0, y: 30, scale: 0.95 },
            { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out', clearProps: 'all' }
        )

        // Animasi chart card
        gsap.fromTo('.chart-card',
            { opacity: 0, y: 40 },
            { opacity: 1, y: 0, duration: 0.6, delay: 0.3, ease: 'power3.out', clearProps: 'all' }
        )

        // Animasi table card
        gsap.fromTo('.table-card',
            { opacity: 0, y: 40 },
            { opacity: 1, y: 0, duration: 0.6, delay: 0.4, ease: 'power3.out', clearProps: 'all' }
        )
    }

    // Handler pas transaksi berhasil disimpan
    function onTransactionSaved() {
        showAddModal.value = false
        if (selectedKandangId.value) {
            loadDashboardData(selectedKandangId.value)
        }
    }

    // Handler pas profil berhasil diupdate
    function onProfileSaved() {
        showProfileModal.value = false
    }

    // Toggle sort - klik header tabel buat sort
    function sortBy(column) {
        if (sortColumn.value === column) {
            sortAsc.value = !sortAsc.value
        } else {
            sortColumn.value = column
            sortAsc.value = true
        }
    }

    // Format currency ke format Rupiah yang proper
    function formatCurrency(val) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(val).replace('IDR', 'Rp.')
    }

    // Format tanggal panjang: "18 Des 2024"
    function formatDate(ts) {
        return new Date(ts).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    // Format tanggal pendek buat chart: "18 Des"
    function formatDateShort(ts) {
        return new Date(ts).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short'
        })
    }

    // Format role biar lebih enak dibaca
    function formatRole(role) {
        const roles = {
            head_owner: 'Head Owner',
            co_owner: 'Co Owner',
            investor: 'Investor',
            user: 'User'
        }
        return roles[role] || role || 'Guest'
    }

    // Logout - clear auth terus redirect ke landing page
    function logout() {
        authStore.logout()
        window.location.href = '/'
    }

    // Return semua yang diperluin sama component
    return {
        // State
        isLoading,
        showAddModal,
        showProfileModal,
        sidebarOpen,
        notificationOpen,
        unreadCount,
        selectedKandangId,
        transactions,
        filterType,
        searchQuery,
        sortColumn,
        sortAsc,

        // Computed
        user,
        isHeadOwner,
        canEdit,
        kandangList,
        currentKandang,
        dashboard,
        filteredTransactions,

        // Methods
        loadKandangList,
        loadDashboardData,
        fetchUnreadCount,
        onKandangChange,
        animateContent,
        onTransactionSaved,
        onProfileSaved,
        sortBy,
        formatCurrency,
        formatDate,
        formatDateShort,
        formatRole,
        logout
    }
}
