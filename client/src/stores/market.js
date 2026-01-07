import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios, { API_URL } from '../api/axios';

export const useMarketStore = defineStore('market', () => {
    // State
    const markets = ref([]); // All markets (global)
    const myMarkets = ref([]); // User's markets
    const currentMarket = ref(null); // Selected market
    const loading = ref(false);
    const error = ref(null);
    const marketCount = ref({ count: 0, canCreate: true });

    // Getters
    const canCreateMarket = computed(() => marketCount.value.canCreate);
    const hasMarkets = computed(() => myMarkets.value.length > 0);

    // ============ ACTIONS ============

    // Fetch semua market (global list)
    async function fetchMarkets() {
        loading.value = true;
        error.value = null;
        try {
            const res = await axios.get(`${API_URL}/api/markets`);
            markets.value = res.data;
        } catch (e) {
            error.value = e.response?.data?.error || e.message;
            console.error('Error fetching markets:', e);
        } finally {
            loading.value = false;
        }
    }

    // Fetch market milik user
    async function fetchMyMarkets(userId) {
        loading.value = true;
        error.value = null;
        try {
            const res = await axios.get(`${API_URL}/api/markets/my`, {
                params: { userId }
            });
            myMarkets.value = res.data;
        } catch (e) {
            error.value = e.response?.data?.error || e.message;
            console.error('Error fetching my markets:', e);
        } finally {
            loading.value = false;
        }
    }

    // Cek jumlah market user & bisa bikin lagi atau engga
    async function checkMarketCount(userId) {
        try {
            const res = await axios.get(`${API_URL}/api/markets/count`, {
                params: { userId }
            });
            marketCount.value = res.data;
        } catch (e) {
            console.error('Error checking market count:', e);
        }
    }

    // Cek ketersediaan handle
    async function checkHandleAvailable(handle) {
        try {
            const res = await axios.get(`${API_URL}/api/markets/check-handle`, {
                params: { handle }
            });
            return res.data;
        } catch (e) {
            console.error('Error checking handle:', e);
            throw e;
        }
    }

    // Fetch detail satu market by ID
    async function fetchMarketById(marketId) {
        loading.value = true;
        error.value = null;
        try {
            const res = await axios.get(`${API_URL}/api/markets/${marketId}`);
            currentMarket.value = res.data;
            return res.data;
        } catch (e) {
            error.value = e.response?.data?.error || e.message;
            console.error('Error fetching market:', e);
            return null;
        } finally {
            loading.value = false;
        }
    }

    // Fetch detail satu market by Handle
    async function fetchMarketByHandle(handle) {
        loading.value = true;
        error.value = null;
        try {
            // Remove @ if present
            const cleanHandle = handle.replace(/^@/, '');
            const res = await axios.get(`${API_URL}/api/markets/h/${cleanHandle}`);
            currentMarket.value = res.data;
            return res.data;
        } catch (e) {
            // Only set error if not 404 (for smoother routing checks)
            // if (e.response?.status !== 404) {
            error.value = e.response?.data?.error || e.message;
            // }
            console.error('Error fetching market by handle:', e);
            return null;
        } finally {
            loading.value = false;
        }
    }

    // Smart fetch - detect ID vs Handle
    async function fetchMarket(identifier) {
        // If identifier looks like a handle (starts with @) or is not a typical ID length
        // Convex IDs are typically base32 string, checking for @ is safest explicit way
        // But for routing /market/kampoengendok vs /market/jx7... 
        // We can try handle first if it doesn't look like an ID, or just try both endpoints?
        // Let's rely on caller or @ prefix convention for explicit routing.
        // However, standard clean URL like /market/kampoengendok doesn't have @.

        // Strategy: 
        // If args starts with '@', fetchByHandle.
        // If length > 20 (Convex IDs are long), fetchById.
        // Else fetchByHandle.

        if (identifier.startsWith('@')) {
            return await fetchMarketByHandle(identifier);
        } else if (identifier.length > 25) { // IDs are usually ~30 chars
            return await fetchMarketById(identifier);
        } else {
            return await fetchMarketByHandle(identifier);
        }
    }

    // Bikin market baru
    async function createMarket({ name, handle, description, logo, userId }) {
        loading.value = true;
        error.value = null;
        try {
            const res = await axios.post(`${API_URL}/api/markets`, {
                name,
                handle,
                description,
                logo,
                userId
            });
            // Refresh markets setelah create
            await fetchMyMarkets(userId);
            await checkMarketCount(userId);
            return res.data;
        } catch (e) {
            error.value = e.response?.data?.error || e.message;
            console.error('Error creating market:', e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    // Update market
    async function updateMarket({ marketId, name, handle, description, logo, logoStorageId, isActive, userId }) {
        loading.value = true;
        error.value = null;
        try {
            const res = await axios.put(`${API_URL}/api/markets/${marketId}`, {
                name,
                handle,
                description,
                logo,
                logoStorageId,
                isActive,
                userId
            });
            // Refresh markets setelah update
            await fetchMyMarkets(userId);

            // Update current market if we are editing it
            if (currentMarket.value && currentMarket.value._id === marketId) {
                // Partial update for UX speed
                currentMarket.value = { ...currentMarket.value, name, handle, description, logo };
            }

            return res.data;
        } catch (e) {
            error.value = e.response?.data?.error || e.message;
            console.error('Error updating market:', e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    // Hapus market (soft delete)
    async function deleteMarket({ marketId, userId }) {
        loading.value = true;
        error.value = null;
        try {
            await axios.delete(`${API_URL}/api/markets/${marketId}`, {
                data: { userId }
            });
            // Refresh markets setelah delete
            await fetchMyMarkets(userId);
            await checkMarketCount(userId);
        } catch (e) {
            error.value = e.response?.data?.error || e.message;
            console.error('Error deleting market:', e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    // Set current market
    function setCurrentMarket(market) {
        currentMarket.value = market;
    }

    // Clear state
    function clearState() {
        markets.value = [];
        myMarkets.value = [];
        currentMarket.value = null;
        error.value = null;
        marketCount.value = { count: 0, canCreate: true };
    }

    return {
        // State
        markets,
        myMarkets,
        currentMarket,
        loading,
        error,
        marketCount,

        // Getters
        canCreateMarket,
        hasMarkets,

        // Actions
        fetchMarkets,
        fetchMyMarkets,
        checkMarketCount,
        checkHandleAvailable,
        fetchMarketById,
        fetchMarketByHandle,
        fetchMarket,
        createMarket,
        updateMarket,
        deleteMarket,
        setCurrentMarket,
        clearState
    };
});
