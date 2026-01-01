<!--
  Navbar.vue - Navigasi atas dashboard
  
  Fitur:
  - Tombol hamburger buat buka sidebar (kiri)
  - Logo/Nama website (tengah)
  
  Props:
  - None
  
  Emits:
  - toggle-sidebar: dipanggil pas klik tombol hamburger
-->

<template>
  <nav class="navbar">
    <div class="navbar-content">
      <!-- Hamburger Button (Left) -->
      <button class="nav-toggle-btn" @click="$emit('toggle-sidebar')">
        ☰
      </button>

      <!-- Brand (Center) -->
      <div class="nav-brand">
        <span class="nav-brand-icon">🐔</span>
        <span class="nav-brand-name">Peternakan</span>
      </div>
      
      <!-- Placeholder (Right) biar center enak -->
      <div class="nav-spacer"></div>
    </div>
  </nav>
</template>

<script setup>
defineEmits(['toggle-sidebar'])
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  z-index: 900; /* Dibawah sidebar overlay (1001) tapi diatas konten */
  display: flex;
  align-items: center;
  padding: 0 16px;
}

.navbar-content {
  width: 100%;
  max-width: 900px; /* Samain kayak max-width dashboard-page */
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

@media (min-width: 769px) {
  .navbar {
    display: none;
  }
}

.nav-toggle-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  color: var(--text-primary, #1e293b);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  width: 40px;
  height: 40px;
}

.nav-toggle-btn:hover {
  background: var(--bg-secondary, #f1f5f9);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.nav-brand-icon {
  font-size: 1.5rem;
}

.nav-brand-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary, #10B981);
}

.nav-spacer {
  width: 40px; /* Balance sama tombol hamburger */
}

@media (min-width: 769px) {
  .nav-toggle-btn {
    display: none;
  }
}
  
  .nav-spacer {
    display: none;
}
</style>
