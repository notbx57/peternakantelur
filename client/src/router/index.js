import { createRouter, createWebHistory } from 'vue-router'

const routes = [
    {
        path: '/',
        name: 'landing',
        component: () => import('../views/LandingView.vue')
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('../views/LoginView.vue')
    },
    {
        path: '/register',
        name: 'register',
        component: () => import('../views/RegisterView.vue')
    },
    // Market Routes
    {
        path: '/market',
        name: 'market',
        component: () => import('../views/MarketView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/market/create',
        name: 'create-market',
        component: () => import('../views/CreateMarketView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/market/my',
        name: 'your-market',
        component: () => import('../views/YourMarketView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/market/:id',
        name: 'market-detail',
        component: () => import('../views/MarketDetailView.vue'),
        meta: { requiresAuth: true }
    },
    // Portfolio - investasi user
    {
        path: '/portfolio',
        name: 'portfolio',
        component: () => import('../views/PortfolioView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/market/@:handle/kandang/:id',
        name: 'kandang-scoped',
        component: () => import('../views/KandangDetailView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/kandang/:id',
        name: 'kandang',
        component: () => import('../views/KandangDetailView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/market/@:handle/kandang/:id/members',
        name: 'members-scoped',
        component: () => import('../views/MembersView.vue'),
        meta: { requiresAuth: true, requiresOwner: true }
    },
    {
        path: '/kandang/:id/members',
        name: 'members',
        component: () => import('../views/MembersView.vue'),
        meta: { requiresAuth: true, requiresOwner: true }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Navigation guard
router.beforeEach((to, from, next) => {
    // Robust check: jangan terjebak string "null" atau "undefined" atau junk dari app lain
    const user = localStorage.getItem('user')
    const token = localStorage.getItem('auth_token')

    // Anggap terautentikasi jika ada token/user string yang valid (bukan dummy/null)
    const isAuthenticated = (user && user !== 'null' && user !== 'undefined' && user.length > 2) ||
        (token && token !== 'null' && token !== 'undefined' && token.length > 5)

    if (to.matched.some(record => record.meta.requiresAuth) && !isAuthenticated) {
        // Redireksi ke login page sesuai request terbaru user
        next('/login')
    } else {
        next()
    }
})

export default router
