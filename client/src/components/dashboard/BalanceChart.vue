<!--
  BalanceChart.vue - Chart buat nampilin perubahan saldo
  
  Pake Chart.js buat bikin line chart yang smooth
  Data diambil dari transaksi terus dikalkulasi running balance-nya
  
  Props:
  - transactions: array transaksi
-->

<template>
  <section class="chart-card card">
    <h3 class="section-title">📈 Perubahan Saldo</h3>
    <div class="chart-container">
      <Line v-if="chartData.datasets[0].data.length" :data="chartData" :options="chartOptions" />
      <p v-else class="empty-chart">Belum ada data untuk chart</p>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler 
} from 'chart.js'

// Register Chart.js components - wajib sebelum dipake
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler
)

// Props
const props = defineProps({
  transactions: {
    type: Array,
    default: () => []
  }
})

// Ref untuk canvas context
const chartRef = ref(null)

// Data chart - dihitung dari transaksi
const chartData = computed(() => {
  const txs = [...props.transactions].sort((a, b) => a.date - b.date)
  let runningBalance = 0
  const labels = []
  const data = []
  
  // Kalkulasi running balance dari setiap transaksi
  for (const tx of txs) {
    if (tx.type === 'income') {
      runningBalance += tx.amount
    } else {
      runningBalance -= tx.amount
    }
    labels.push(formatDateShort(tx.date))
    data.push(runningBalance)
  }
  
  // Buat gradient yang berubah warna di y=0
  const createGradient = (ctx, chartArea) => {
    if (!chartArea) return 'rgba(5, 150, 105, 0.1)'
    
    const { top, bottom } = chartArea
    const gradient = ctx.createLinearGradient(0, top, 0, bottom)
    
    // Cek range data buat tau posisi 0
    const maxVal = Math.max(...data)
    const minVal = Math.min(...data)
    
    if (maxVal === minVal) {
      // Kalo semua nilai sama
      const color = maxVal >= 0 ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)'
      gradient.addColorStop(0, color)
      gradient.addColorStop(1, color)
    } else if (maxVal <= 0) {
      // Semua negatif
      gradient.addColorStop(0, 'rgba(220, 38, 38, 0.2)')
      gradient.addColorStop(1, 'rgba(220, 38, 38, 0.1)')
    } else if (minVal >= 0) {
      // Semua positif
      gradient.addColorStop(0, 'rgba(5, 150, 105, 0.2)')
      gradient.addColorStop(1, 'rgba(5, 150, 105, 0.1)')
    } else {
      // Mixed: hijau di atas, merah di bawah
      const range = maxVal - minVal
      const zeroPosition = maxVal / range
      
      gradient.addColorStop(0, 'rgba(5, 150, 105, 0.2)')
      gradient.addColorStop(zeroPosition, 'rgba(5, 150, 105, 0.05)')
      gradient.addColorStop(zeroPosition, 'rgba(220, 38, 38, 0.05)')
      gradient.addColorStop(1, 'rgba(220, 38, 38, 0.2)')
    }
    
    return gradient
  }
  
  // Tentuin warna garis berdasarkan saldo akhir
  const finalBalance = data[data.length - 1] || 0
  const lineColor = finalBalance >= 0 ? '#059669' : '#DC2626'
  const pointColor = finalBalance >= 0 ? '#059669' : '#DC2626'
  
  return {
    labels,
    datasets: [{
      label: 'Saldo',
      data,
      fill: true,
      borderColor: (context) => {
        const chart = context.chart
        const { ctx, chartArea } = chart
        if (!chartArea) return lineColor
        return lineColor
      },
      backgroundColor: (context) => {
        const chart = context.chart
        const { ctx, chartArea } = chart
        if (!chartArea) return 'rgba(5, 150, 105, 0.1)'
        return createGradient(ctx, chartArea)
      },
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: (context) => {
        // Warna dot berdasarkan nilai y
        const value = context.parsed?.y
        return value >= 0 ? '#059669' : '#DC2626'
      },
      segment: {
        borderColor: (ctx) => {
          // Warna segmen berdasarkan posisi relatif ke 0
          const y0 = ctx.p0.parsed.y
          const y1 = ctx.p1.parsed.y
          
          if (y0 >= 0 && y1 >= 0) return '#059669' // Hijau
          if (y0 < 0 && y1 < 0) return '#DC2626'   // Merah
          return '#94A3B8' // Abu-abu kalo crossing
        }
      }
    }]
  }
})

// Options buat Chart.js
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `Saldo: ${formatCurrency(ctx.parsed.y)}`
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (val) => formatCurrencyShort(val)
      },
      grid: {
        color: (context) => {
          // Garis 0 lebih terang
          return context.tick.value === 0 ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'
        },
        lineWidth: (context) => {
          return context.tick.value === 0 ? 2 : 1
        }
      }
    },
    x: {
      grid: {
        display: false
      }
    }
  }
}

// Format tanggal pendek: "18 Des"
function formatDateShort(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short' 
  })
}

// Format currency lengkap
function formatCurrency(val) {
  const formatted = new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val).replace('IDR', 'Rp')
  return formatted
}

// Format currency pendek buat label axis
function formatCurrencyShort(val) {
  const absVal = Math.abs(val)
  const sign = val < 0 ? '-' : ''
  
  if (absVal >= 1000000000) {
    return sign + 'Rp ' + (absVal / 1000000000).toFixed(1) + 'M'
  }
  if (absVal >= 1000000) {
    return sign + 'Rp ' + (absVal / 1000000).toFixed(1) + 'jt'
  }
  if (absVal >= 1000) {
    return sign + 'Rp ' + (absVal / 1000).toFixed(0) + 'rb'
  }
  if (absVal === 0) {
    return 'Rp 0'
  }
  return sign + 'Rp ' + absVal
}
</script>

<style scoped>
.chart-card {
  margin-bottom: 16px;
}

.section-title {
  font-size: 1rem;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.chart-container {
  height: 200px;
  position: relative;
}

.empty-chart {
  text-align: center;
  color: var(--text-secondary);
  padding: 40px 0;
}
</style>
