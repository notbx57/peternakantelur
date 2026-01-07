<template>
  <div class="landing-page" ref="pageRef">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content" ref="heroRef">
        <div class="logo" ref="logoRef">🐔</div>
        <h1 ref="titleRef">Endogvest</h1>
        <p class="subtitle" ref="subtitleRef">Sistem Pelacakan Pengeluaran Peternakan Ayam</p>
        <p class="desc" ref="descRef">
          Platform untuk mencatat, mengelola, dan memantau biaya operasional 
          peternakan ayam dengan transparansi untuk investor.
        </p>
        <div class="btn-group" ref="btnsRef">
          <button @click="navigateWithAnimation('/login')" class="btn btn-primary btn-lg">
            Masuk
          </button>
          <button @click="navigateWithAnimation('/register')" class="btn btn-secondary btn-lg">
            Daftar Baru
          </button>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="features" ref="featuresRef">
      <h2>Fitur Utama</h2>
      <div class="feature-grid">
        <div class="feature-card" v-for="(feature, index) in features" :key="index" ref="featureCards">
          <span class="feature-icon">{{ feature.icon }}</span>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.desc }}</p>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <p>&copy; 2025 IDL 1. Made through hardship.</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'

const router = useRouter()

// Refs untuk animasi
const pageRef = ref(null)
const logoRef = ref(null)
const titleRef = ref(null)
const subtitleRef = ref(null)
const descRef = ref(null)
const btnsRef = ref(null)
const featuresRef = ref(null)
const featureCards = ref([])

// Data fitur
const features = [
  {
    icon: '📊',
    title: 'Dashboard Ringkas',
    desc: 'Lihat total pengeluaran, pemasukan, dan saldo dalam satu tampilan'
  },
  {
    icon: '📝',
    title: 'Catat Pengeluaran',
    desc: 'Input pengeluaran harian dengan kategori yang terstruktur'
  },
  {
    icon: '📈',
    title: 'Analisis Grafik',
    desc: 'Visualisasi pengeluaran per kategori dan trend bulanan'
  },
  {
    icon: '👥',
    title: 'Multi-User',
    desc: 'Head Owner, Co-Owner, dan Investor dengan akses berbeda'
  }
]

// Animasi entrance saat page load
onMounted(() => {
  const tl = gsap.timeline({ defaults: { ease: 'back.out(1.7)' } })
  
  // Pop-in animation untuk hero elements
  tl.fromTo(logoRef.value, 
    { scale: 0, opacity: 0, rotation: -180 },
    { scale: 1, opacity: 1, rotation: 0, duration: 0.8 }
  )
  .fromTo(titleRef.value,
    { scale: 0.5, opacity: 0, y: 30 },
    { scale: 1, opacity: 1, y: 0, duration: 0.6 },
    '-=0.4'
  )
  .fromTo(subtitleRef.value,
    { scale: 0.8, opacity: 0, y: 20 },
    { scale: 1, opacity: 1, y: 0, duration: 0.5 },
    '-=0.3'
  )
  .fromTo(descRef.value,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.5 },
    '-=0.2'
  )
  .fromTo(btnsRef.value,
    { scale: 0.8, opacity: 0, y: 20 },
    { scale: 1, opacity: 1, y: 0, duration: 0.5 },
    '-=0.2'
  )
  
  // Staggered pop-in untuk feature cards
  gsap.fromTo('.feature-card',
    { scale: 0.5, opacity: 0, y: 40 },
    { 
      scale: 1, 
      opacity: 1, 
      y: 0, 
      duration: 0.6,
      stagger: 0.15,
      ease: 'back.out(1.4)',
      scrollTrigger: {
        trigger: '.features',
        start: 'top 80%',
      }
    }
  )
})

// Navigasi dengan animasi pop-out
function navigateWithAnimation(path) {
  const tl = gsap.timeline({
    onComplete: () => router.push(path)
  })
  
  // Pop-out animation - everything shrinks and fades out
  tl.to('.feature-card', {
    scale: 0.8,
    opacity: 0,
    y: 30,
    duration: 0.3,
    stagger: 0.05,
    ease: 'power2.in'
  })
  .to([descRef.value, subtitleRef.value], {
    scale: 0.9,
    opacity: 0,
    y: -20,
    duration: 0.25,
    ease: 'power2.in'
  }, '-=0.2')
  .to(btnsRef.value, {
    scale: 0.8,
    opacity: 0,
    duration: 0.2,
    ease: 'power2.in'
  }, '-=0.2')
  .to(titleRef.value, {
    scale: 0.5,
    opacity: 0,
    duration: 0.3,
    ease: 'power2.in'
  }, '-=0.15')
  .to(logoRef.value, {
    scale: 2,
    opacity: 0,
    rotation: 180,
    duration: 0.4,
    ease: 'power2.in'
  }, '-=0.2')
  .to(pageRef.value, {
    opacity: 0,
    duration: 0.2
  }, '-=0.1')
}
</script>

<style scoped>
.landing-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%);
}

.hero {
  padding: 60px 20px;
  text-align: center;
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-content {
  max-width: 500px;
}

.logo {
  font-size: 4rem;
  margin-bottom: 16px;
}

h1 {
  font-size: 2.5rem;
  color: #059669;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 1.1rem;
  color: #64748B;
  margin-bottom: 16px;
}

.desc {
  color: #64748B;
  margin-bottom: 32px;
  line-height: 1.6;
}

.btn-group {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 14px 28px;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: none;
  font-family: inherit;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.btn-primary {
  background: #10B981;
  color: white;
}

.btn-primary:hover {
  background: #059669;
}

.btn-secondary {
  background: white;
  color: #10B981;
  border: 2px solid #10B981;
}

.btn-secondary:hover {
  background: #F0FDF4;
}

.btn-lg {
  padding: 16px 32px;
  font-size: 1.1rem;
}

.features {
  padding: 40px 20px;
  background: white;
}

.features h2 {
  text-align: center;
  margin-bottom: 32px;
  color: #1E293B;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.feature-card {
  background: #F8FAFC;
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  transition: transform 0.3s, box-shadow 0.3s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}

.feature-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 12px;
}

.feature-card h3 {
  margin-bottom: 8px;
  color: #1E293B;
}

.feature-card p {
  font-size: 0.875rem;
  color: #64748B;
}

.footer {
  text-align: center;
  padding: 24px;
  color: #64748B;
  font-size: 0.875rem;
}
</style>
