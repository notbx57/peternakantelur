<template>
  <div class="login-page" ref="pageRef">
    <div class="login-container" ref="containerRef">
      <div class="logo" ref="logoRef">🐔</div>
      <h1 ref="titleRef">Masuk</h1>
      <p class="subtitle" ref="subtitleRef">Masuk untuk mengelola peternakan Anda</p>
      
      <!-- Error message -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="login-form" ref="formRef">
        <div class="form-group">
          <label for="identifier">Email atau Username</label>
          <input
            id="identifier"
            v-model="identifier"
            type="text"
            placeholder="email@example.com atau username"
            required
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Password"
            required
            :disabled="loading"
          />
        </div>

        <button type="submit" class="btn-login" :disabled="loading">
          {{ loading ? 'Memuat...' : 'Masuk' }}
        </button>
      </form>

      <!-- Register link -->
      <p class="register-link" ref="linkRef">
        Belum punya akun? 
        <a href="#" @click.prevent="navigateWithAnimation('/register')">Daftar di sini</a>
      </p>

      <a href="#" class="back-link" @click.prevent="navigateWithAnimation('/')">← Kembali ke beranda</a>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import gsap from 'gsap'

const router = useRouter()
const authStore = useAuthStore()

import { API_URL } from '@/api/axios'

// Form data
const identifier = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

// Animation refs
const pageRef = ref(null)
const containerRef = ref(null)
const logoRef = ref(null)
const titleRef = ref(null)
const subtitleRef = ref(null)
const formRef = ref(null)
const linkRef = ref(null)

// Pop-in animation saat masuk halaman
onMounted(() => {
  const tl = gsap.timeline({ defaults: { ease: 'back.out(1.7)' } })
  
  tl.fromTo(containerRef.value,
    { scale: 0.8, opacity: 0, y: 40 },
    { scale: 1, opacity: 1, y: 0, duration: 0.5 }
  )
  .fromTo(logoRef.value,
    { scale: 0, rotation: -180 },
    { scale: 1, rotation: 0, duration: 0.6 },
    '-=0.3'
  )
  .fromTo(titleRef.value,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.4 },
    '-=0.3'
  )
  .fromTo(subtitleRef.value,
    { opacity: 0, y: 15 },
    { opacity: 1, y: 0, duration: 0.3 },
    '-=0.2'
  )
  .fromTo(formRef.value,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.4 },
    '-=0.2'
  )
  .fromTo(linkRef.value,
    { opacity: 0 },
    { opacity: 1, duration: 0.3 },
    '-=0.1'
  )
})

// Navigasi dengan animasi pop-out
function navigateWithAnimation(path) {
  const tl = gsap.timeline({
    onComplete: () => router.push(path)
  })
  
  tl.to(formRef.value, {
    opacity: 0,
    y: -20,
    duration: 0.2,
    ease: 'power2.in'
  })
  .to([titleRef.value, subtitleRef.value, linkRef.value], {
    opacity: 0,
    y: -15,
    duration: 0.2,
    ease: 'power2.in'
  }, '-=0.1')
  .to(logoRef.value, {
    scale: 1.5,
    opacity: 0,
    rotation: 180,
    duration: 0.3,
    ease: 'power2.in'
  }, '-=0.15')
  .to(containerRef.value, {
    scale: 0.9,
    opacity: 0,
    duration: 0.2,
    ease: 'power2.in'
  }, '-=0.1')
}

async function handleLogin() {
  loading.value = true
  error.value = ''

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: identifier.value,
        password: password.value
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      error.value = data.error || 'Login gagal'
      return
    }

    localStorage.setItem('auth_token', data.token)
    authStore.setUser({
      _id: data.user.userId,
      email: data.user.email,
      username: data.user.username,
      name: data.user.name,
      role: data.user.role,
      avatar: data.user.avatar
    })

    // Animasi pop-out sebelum redirect
    navigateWithAnimation('/market/my')

  } catch (err) {
    console.error('Login error:', err)
    error.value = 'Terjadi kesalahan. Coba lagi nanti.'
  } finally {
    loading.value = false
  }
}

// Login dengan akun demo
async function loginDemo() {
  identifier.value = 'admin'
  password.value = 'Admin123!'
  await handleLogin()
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%);
}

.login-container {
  background: white;
  padding: 40px 32px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.logo {
  font-size: 3rem;
  margin-bottom: 16px;
}

h1 {
  color: #1E293B;
  margin-bottom: 8px;
}

.subtitle {
  color: #64748B;
  margin-bottom: 24px;
}

.error-message {
  background: #FEE2E2;
  color: #DC2626;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 0.875rem;
}

.login-form {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  color: #334155;
  font-weight: 500;
  font-size: 0.875rem;
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
  font-family: inherit;
}

.form-group input:focus {
  outline: none;
  border-color: #10B981;
}

.form-group input:disabled {
  background: #F1F5F9;
  cursor: not-allowed;
}

.btn-login {
  width: 100%;
  padding: 14px 24px;
  background: #10B981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-login:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.register-link {
  margin-top: 16px;
  color: #64748B;
  font-size: 0.875rem;
}

.register-link a {
  color: #10B981;
  text-decoration: none;
  font-weight: 600;
}

.register-link a:hover {
  text-decoration: underline;
}

.back-link {
  display: inline-block;
  margin-top: 24px;
  color: #64748B;
  text-decoration: none;
  font-size: 0.875rem;
}

.back-link:hover {
  color: #059669;
}

.demo-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px dashed #E2E8F0;
}

.demo-text {
  font-size: 0.875rem;
  color: #64748B;
  margin-bottom: 12px;
}

.btn-demo {
  width: 100%;
  padding: 12px 20px;
  background: #F0FDF4;
  color: #059669;
  border: 2px solid #10B981;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-demo:hover:not(:disabled) {
  background: #10B981;
  color: white;
  transform: translateY(-1px);
}

.btn-demo:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
