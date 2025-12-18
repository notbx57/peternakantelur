<!--
  StatsCard.vue - Komponen buat card statistik
  
  Dipake buat nampilin:
  - Total Pemasukan (income)
  - Total Pengeluaran (expense)  
  - Saldo (balance) - bisa merah kalo minus
  
  Props:
  - type: 'income' | 'expense' | 'balance'
  - value: angka yang mau ditampilin
  - label: teks di bawah angka
  - negative: boolean buat style saldo minus
-->

<template>
  <div :class="['stat-card', type, { negative: negative }]">
    <div class="stat-icon">{{ icon }}</div>
    <div class="stat-content">
      <div class="stat-value">{{ formattedValue }}</div>
      <div class="stat-label">{{ label }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// Props yang diterima component
const props = defineProps({
  type: {
    type: String,
    default: 'income' // income | expense | balance
  },
  value: {
    type: Number,
    default: 0
  },
  label: {
    type: String,
    default: ''
  },
  negative: {
    type: Boolean,
    default: false
  }
})

// Icon berdasarkan tipe card
const icon = computed(() => {
  const icons = {
    income: '💰',
    expense: '📤',
    balance: '💵'
  }
  return icons[props.type] || '📊'
})

// Format ke rupiah yang proper
const formattedValue = computed(() => {
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(props.value).replace('IDR', 'Rp.')
})
</script>

<style scoped>
/* Style card statistik */
.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.stat-icon {
  font-size: 2rem;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Style khusus buat income - aksen hijau */
.stat-card.income {
  border-left: 4px solid var(--primary);
}

/* Style khusus buat expense - aksen merah */
.stat-card.expense {
  border-left: 4px solid var(--danger);
}

/* Style khusus buat balance - aksen biru */
.stat-card.balance {
  border-left: 4px solid #3B82F6;
}

/* Kalo saldo minus, value-nya jadi merah */
.stat-card.negative .stat-value {
  color: var(--danger);
}

/* Mobile Responsive: Center Content */
@media (max-width: 768px) {
  .stat-card {
    flex-direction: column;
    text-align: center;
    padding: 20px;
  }
  
  .stat-content {
    align-items: center;
  }
  
  .stat-icon {
    font-size: 2.5rem; /* Gedein dikit iconnya pas mobile */
    margin-bottom: 8px;
  }
}
</style>
