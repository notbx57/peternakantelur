import axios from 'axios'
import router from '../router'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Create axios instance dengan base URL
const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// Request interceptor - otomatis tambah token ke setiap request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token')
        if (token && token !== 'null' && token !== 'undefined') {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Response interceptor - handle 401 Unauthorized
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired atau invalid, hapus data dan redirect ke login
            localStorage.removeItem('user')
            localStorage.removeItem('auth_token')
            router.push('/login')
        }
        return Promise.reject(error)
    }
)

export default api
export { API_URL }
