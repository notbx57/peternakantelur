<template>
  <div class="register-page" ref="pageRef">
    <div class="register-container" ref="containerRef">
      <div class="logo" ref="logoRef">🐔</div>
      <h1 ref="titleRef">Daftar Akun</h1>
      <p class="subtitle" ref="subtitleRef">Buat akun baru untuk mulai mengelola peternakan</p>
      
      <!-- Error message -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <!-- Success message -->
      <div v-if="success" class="success-message">
        {{ success }}
      </div>

      <!-- Register Form -->
      <form @submit.prevent="handleRegister" class="register-form" ref="formRef">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="email@example.com"
            required
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            placeholder="username (3-20 karakter)"
            required
            :disabled="loading"
          />
          <small>Hanya huruf, angka, dan underscore</small>
        </div>

        <div class="form-group">
          <label for="name">Nama Lengkap</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            placeholder="Nama lengkap"
            required
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="Min 8 karakter + 1 karakter spesial"
            required
            :disabled="loading"
          />
          <small>Minimal 8 karakter dengan karakter spesial (!@#$% dll)</small>
        </div>

        <div class="form-group">
          <label for="confirmPassword">Konfirmasi Password</label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            placeholder="Ketik ulang password"
            required
            :disabled="loading"
          />
        </div>

        <button type="submit" class="btn-register" :disabled="loading">
          {{ loading ? 'Memuat...' : 'Daftar' }}
        </button>
      </form>

      <!-- Login link -->
      <p class="login-link" ref="linkRef">
        Sudah punya akun? 
        <a href="#" @click.prevent="navigateWithAnimation('/login')">Masuk di sini</a>
      </p>

      <a href="#" class="back-link" @click.prevent="navigateWithAnimation('/')">← Kembali ke beranda</a>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import gsap from 'gsap'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  email: '',
  username: '',
  name: '',
  password: '',
  confirmPassword: ''
})

const loading = ref(false)
const error = ref('')
const success = ref('')

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

async function handleRegister() {
  loading.value = true
  error.value = ''
  success.value = ''

  // Client-side validation
  if (form.password !== form.confirmPassword) {
    error.value = 'Password tidak sama'
    loading.value = false
    return
  }

  if (form.username.length < 3 || form.username.length > 20) {
    error.value = 'Username harus 3-20 karakter'
    loading.value = false
    return
  }

  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
  if (!usernameRegex.test(form.username)) {
    error.value = 'Username hanya boleh huruf, angka, dan underscore'
    loading.value = false
    return
  }

  if (form.password.length < 8) {
    error.value = 'Password minimal 8 karakter'
    loading.value = false
    return
  }

  const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/
  if (!specialCharRegex.test(form.password)) {
    error.value = 'Password harus mengandung minimal 1 karakter spesial'
    loading.value = false
    return
  }

  try {
    const response = await fetch('http://localhost:3001/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        username: form.username,
        name: form.name,
        password: form.password
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      error.value = data.error || 'Registrasi gagal'
      return
    }

    success.value = data.message
    localStorage.setItem('auth_token', data.token)

    authStore.setUser({
      _id: data.user.userId,
      email: data.user.email,
      username: data.user.username,
      name: data.user.name,
      role: data.user.role,
      avatar: null
    })

    // Animasi pop-out sebelum redirect
    setTimeout(() => {
      navigateWithAnimation('/dashboard')
    }, 800)

  } catch (err) {
    console.error('Register error:', err)
    error.value = 'Terjadi kesalahan. Coba lagi nanti.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%);
}

.register-container {
  background: white;
  padding: 40px 32px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  text-align: center;
  max-width: 450px;
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

.success-message {
  background: #D1FAE5;
  color: #059669;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 0.875rem;
}

.register-form {
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

.form-group small {
  display: block;
  margin-top: 4px;
  color: #64748B;
  font-size: 0.75rem;
}

.btn-register {
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

.btn-register:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
}

.btn-register:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-link {
  margin-top: 16px;
  color: #64748B;
  font-size: 0.875rem;
}

.login-link a {
  color: #10B981;
  text-decoration: none;
  font-weight: 600;
}

.login-link a:hover {
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
</style>
