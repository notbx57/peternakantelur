<!--
  TransactionsTable.vue - Tabel daftar transaksi
  
  Fitur:
  - Filter berdasarkan tipe (income/expense)
  - Search berdasarkan deskripsi
  - Sortable columns (klik header buat sort)
  - Responsive horizontal scroll
  
  Props:
  - transactions: array transaksi yang udah difilter
  
  Emits:
  - sort: dipanggil pas user klik header buat sort
  - update:filterType: two-way binding filter tipe
  - update:searchQuery: two-way binding search
-->

<template>
  <section class="table-card card">
    <!-- Header dengan filter -->
    <div class="table-header">
      <h3 class="section-title">📋 Daftar Transaksi</h3>
      <div class="table-filters">
        <select 
          :value="filterType" 
          @change="$emit('update:filterType', $event.target.value)" 
          class="filter-select"
        >
          <option value="">Semua Tipe</option>
          <option value="income">Masuk</option>
          <option value="expense">Keluar</option>
        </select>
        <input 
          type="text" 
          :value="searchQuery"
          @input="$emit('update:searchQuery', $event.target.value)" 
          class="filter-input" 
          placeholder="🔍 Cari..."
        />
      </div>
    </div>
    
    <!-- Table wrapper buat horizontal scroll di mobile -->
    <div class="table-wrapper">
      <table class="transactions-table">
        <thead>
          <tr>
            <th @click="$emit('sort', 'date')" class="sortable">
              Tanggal {{ sortColumn === 'date' ? (sortAsc ? '↑' : '↓') : '' }}
            </th>
            <th @click="$emit('sort', 'description')" class="sortable">
              Keterangan {{ sortColumn === 'description' ? (sortAsc ? '↑' : '↓') : '' }}
            </th>
            <th @click="$emit('sort', 'type')" class="sortable">
              Tipe {{ sortColumn === 'type' ? (sortAsc ? '↑' : '↓') : '' }}
            </th>
            <th @click="$emit('sort', 'amount')" class="sortable">
              Jumlah {{ sortColumn === 'amount' ? (sortAsc ? '↑' : '↓') : '' }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tx in transactions" :key="tx._id">
            <td class="date-cell">{{ formatDate(tx.date) }}</td>
            <td class="desc-cell">{{ tx.description }}</td>
            <td>
              <span :class="['type-badge', tx.type]">
                {{ tx.type === 'income' ? 'Masuk' : 'Keluar' }}
              </span>
            </td>
            <td :class="['amount-cell', tx.type]">
              {{ tx.type === 'income' ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
            </td>
          </tr>
          <!-- Empty state -->
          <tr v-if="transactions.length === 0">
            <td colspan="4" class="empty-state">
              Tidak ada data transaksi
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
// Props
defineProps({
  transactions: {
    type: Array,
    default: () => []
  },
  filterType: {
    type: String,
    default: ''
  },
  searchQuery: {
    type: String,
    default: ''
  },
  sortColumn: {
    type: String,
    default: 'date'
  },
  sortAsc: {
    type: Boolean,
    default: false
  }
})

// Emits
defineEmits(['sort', 'update:filterType', 'update:searchQuery'])

// Format tanggal: "18 Des 2024"
function formatDate(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  })
}

// Format currency lengkap
function formatCurrency(val) {
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 2 
  }).format(val).replace('IDR', 'Rp.')
}
</script>

<style scoped>
.table-card {
  margin-bottom: 16px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 1rem;
  color: var(--text-primary);
  margin: 0;
}

.table-filters {
  display: flex;
  gap: 8px;
}

.filter-select,
.filter-input {
  padding: 8px 12px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 0.875rem;
}

.filter-input {
  width: 140px;
}

.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.transactions-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 500px;
}

.transactions-table th,
.transactions-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #E2E8F0;
}

.transactions-table th {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  font-weight: 500;
}

.transactions-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.transactions-table th.sortable:hover {
  color: var(--primary);
}

.date-cell {
  white-space: nowrap;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.desc-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.type-badge.income {
  background: #D1FAE5;
  color: var(--primary);
}

.type-badge.expense {
  background: #FEE2E2;
  color: var(--danger);
}

.amount-cell {
  font-weight: 600;
  white-space: nowrap;
}

.amount-cell.income {
  color: var(--primary);
}

.amount-cell.expense {
  color: var(--danger);
}

.empty-state {
  text-align: center;
  color: var(--text-secondary);
  padding: 32px 0;
}
</style>
