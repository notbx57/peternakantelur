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
    {
        path: '/dashboard',
        name: 'dashboard',
        component: () => import('../views/DashboardView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/kandang/:id',
        name: 'kandang',
        component: () => import('../views/KandangView.vue'),
        meta: { requiresAuth: true }
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
    const isAuthenticated = localStorage.getItem('user')

    if (to.meta.requiresAuth && !isAuthenticated) {
        next('/login')
    } else {
        next()
    }
})

export default router
