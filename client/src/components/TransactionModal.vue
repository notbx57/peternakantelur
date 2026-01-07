<template>
  <div class="modal-overlay" ref="overlayRef" @click.self="closeWithAnimation">
    <div class="modal" ref="modalRef">
      <div class="modal-header">
        <h3>{{ editing ? 'Edit Transaksi' : 'Tambah Transaksi' }}</h3>
        <button class="close-btn" @click="closeWithAnimation">✕</button>
      </div>

      <!-- Current Kandang Info -->
      <div class="kandang-info" v-if="currentKandang">
        <span class="kandang-icon">🏠</span>
        <span class="kandang-name">{{ currentKandang.name }}</span>
      </div>

      <form @submit.prevent="handleSubmit">
        <!-- Type Toggle -->
        <div class="type-toggle">
          <button 
            type="button" 
            :class="['toggle-btn', form.type === 'expense' && 'active expense']"
            @click="form.type = 'expense'; form.category = 'Pakan'"
          >
            📤 Pengeluaran
          </button>
          <button 
            type="button" 
            :class="['toggle-btn', form.type === 'income' && 'active income']"
            @click="form.type = 'income'; form.category = 'Investasi'"
          >
            💰 Pemasukan
          </button>
        </div>

        <!-- Amount -->
        <div class="form-group">
          <label>Jumlah (Rp)</label>
          <input 
            type="number" 
            v-model="form.amount" 
            class="input amount-input"
            placeholder="0"
            required
          />
        </div>

        <!-- Description -->
        <div class="form-group">
          <label>Keterangan</label>
          <input 
            type="text" 
            v-model="form.description" 
            class="input"
            placeholder="Contoh: Pembelian pakan 2 ton"
            required
          />
        </div>

        <!-- Category -->
        <div class="form-group">
          <label>Kategori</label>
          <div class="category-grid">
            <button 
              v-for="cat in filteredCategories" 
              :key="cat.name"
              type="button"
              :class="['category-btn', form.category === cat.name && 'selected']"
              :style="{ '--cat-color': cat.color }"
              @click="form.category = cat.name; form.categoryId = cat._id"
            >
              <span class="cat-icon">{{ cat.icon }}</span>
              <span class="cat-name">{{ cat.name }}</span>
            </button>
          </div>
        </div>

        <!-- Date -->
        <div class="form-group">
          <label>Tanggal</label>
          <input 
            type="date" 
            v-model="form.date" 
            class="input"
            required
          />
        </div>

        <!-- Submit -->
        <button type="submit" class="btn btn-primary btn-lg w-full mt-md" :disabled="loading">
          {{ loading ? 'Menyimpan...' : (editing ? 'Simpan Perubahan' : 'Tambah Transaksi') }}
        </button>
      </form>
    </div>

    <!-- Toast Notification -->
    <div v-if="showToast" class="toast success">
      <span class="toast-icon">✓</span>
      <span>Transaksi berhasil ditambahkan</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useKandangStore } from '../stores/kandang'
import { useAuthStore } from '../stores/auth'
import gsap from 'gsap'
import axios, { API_URL } from '@/api/axios'

const props = defineProps({
  transaction: Object // for editing
})

const emit = defineEmits(['close', 'saved'])

const kandangStore = useKandangStore()
const authStore = useAuthStore()
const loading = ref(false)
const showToast = ref(false)
const categoriesList = ref([])

// Animation refs
const overlayRef = ref(null)
const modalRef = ref(null)

const editing = computed(() => !!props.transaction)
const currentKandang = computed(() => kandangStore.currentKandang)
const user = computed(() => authStore.user)

// Default categories - will be updated from API
const defaultCategories = [
  // Expense
  { name: 'Pakan', icon: '🌾', color: '#F59E0B', type: 'expense' },
  { name: 'Obat & Vaksin', icon: '💊', color: '#EF4444', type: 'expense' },
  { name: 'Gas Elpiji', icon: '🔥', color: '#F97316', type: 'expense' },
  { name: 'Gaji Karyawan', icon: '👷', color: '#8B5CF6', type: 'expense' },
  { name: 'Listrik', icon: '⚡', color: '#3B82F6', type: 'expense' },
  { name: 'Transportasi', icon: '🚗', color: '#6366F1', type: 'expense' },
  { name: 'Peralatan', icon: '🔧', color: '#64748B', type: 'expense' },
  { name: 'Admin Bank', icon: '🏦', color: '#78716C', type: 'expense' },
  { name: 'Pullet/DOC', icon: '🐣', color: '#FBBF24', type: 'expense' },
  { name: 'Pembangunan', icon: '🏗️', color: '#0EA5E9', type: 'expense' },
  { name: 'Investasi', icon: '💼', color: '#10B981', type: 'expense' },
  { name: 'Lain-lain', icon: '📦', color: '#94A3B8', type: 'expense' },
  // Income
  { name: 'Investasi', icon: '💰', color: '#22C55E', type: 'income' },
  { name: 'Penjualan Telur', icon: '🥚', color: '#10B981', type: 'income' },
  { name: 'Penjualan Ayam', icon: '🐔', color: '#059669', type: 'income' },
  { name: 'Bunga Bank', icon: '📈', color: '#14B8A6', type: 'income' },
  { name: 'Lainnya', icon: '💵', color: '#34D399', type: 'income' },
]

const form = ref({
  type: 'expense',
  amount: '',
  description: '',
  category: 'Pakan',
  categoryId: '',
  date: new Date().toISOString().split('T')[0]
})

const filteredCategories = computed(() => {
  const cats = categoriesList.value.length > 0 ? categoriesList.value : defaultCategories
  return cats.filter(c => c.type === form.value.type)
})

onMounted(async () => {
  // Pop-in animation saat modal muncul
  gsap.fromTo(overlayRef.value, 
    { opacity: 0 },
    { opacity: 1, duration: 0.3, ease: 'power2.out' }
  )
  gsap.fromTo(modalRef.value,
    { scale: 0.8, opacity: 0, y: 30 },
    { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.7)' }
  )

  // Load categories from API
  try {
    const response = await axios.get(`${API_URL}/api/categories`)
    categoriesList.value = response.data
    // Set initial categoryId
    const firstCat = categoriesList.value.find(c => c.type === form.value.type)
    if (firstCat) {
      form.value.categoryId = firstCat._id
    }
  } catch (e) {
    console.error('Error loading categories:', e)
  }

  // Load existing transaction data if editing
  if (props.transaction) {
    form.value = {
      type: props.transaction.type,
      amount: props.transaction.amount,
      description: props.transaction.description,
      category: props.transaction.category?.name || 'Lain-lain',
      categoryId: props.transaction.categoryId,
      date: new Date(props.transaction.date).toISOString().split('T')[0]
    }
  }
})

// Close dengan animasi pop-out
function closeWithAnimation() {
  const tl = gsap.timeline({
    onComplete: () => emit('close')
  })

  tl.to(modalRef.value, {
    scale: 0.9,
    opacity: 0,
    y: 20,
    duration: 0.25,
    ease: 'power2.in'
  })
  .to(overlayRef.value, {
    opacity: 0,
    duration: 0.2
  }, '-=0.15')
}

async function handleSubmit() {
  if (!currentKandang.value?._id) {
    alert('Silakan pilih kandang terlebih dahulu')
    return
  }

  if (!form.value.categoryId) {
    // Find category ID by name
    const cat = categoriesList.value.find(c => c.name === form.value.category && c.type === form.value.type)
    if (cat) {
      form.value.categoryId = cat._id
    } else {
      alert('Pilih kategori terlebih dahulu')
      return
    }
  }

  loading.value = true
  try {
    const transactionData = {
      kandangId: currentKandang.value._id,
      categoryId: form.value.categoryId,
      categoryName: form.value.category, // Kirim nama kategori juga
      createdBy: user.value._id,
      amount: Number(form.value.amount),
      type: form.value.type,
      description: form.value.description,
      date: new Date(form.value.date).getTime()
    }

    const url = editing.value 
      ? `${API_URL}/api/transactions/kandang/${currentKandang.value._id}/${props.transaction._id}`
      : `${API_URL}/api/transactions/kandang/${currentKandang.value._id}`
    
    const method = editing.value ? 'put' : 'post'
    
    const response = await axios[method](url, transactionData)

    if (response.status === 200 || response.status === 201) {
      // Show toast
      showToast.value = true
      
      // Hide toast and close modal after delay
      setTimeout(() => {
        showToast.value = false
        emit('saved')
        emit('close')
      }, 1500)
    } else {
      alert('Gagal menyimpan transaksi')
    }
  } catch (e) {
    console.error('Error saving transaction:', e)
    alert('Error menyimpan transaksi: ' + (e.response?.data?.error || e.message))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.kandang-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #F0FDF4;
  border-radius: 8px;
  margin-bottom: 16px;
}

.kandang-icon {
  font-size: 1.25rem;
}

.kandang-name {
  font-weight: 600;
  color: var(--primary);
}

.type-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.toggle-btn {
  flex: 1;
  padding: 12px;
  border: 2px solid #E2E8F0;
  border-radius: 8px;
  background: white;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn.active.expense {
  border-color: var(--danger);
  background: #FEF2F2;
  color: var(--danger);
}

.toggle-btn.active.income {
  border-color: var(--success);
  background: #F0FDF4;
  color: var(--success);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.amount-input {
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.category-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border: 2px solid #E2E8F0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.category-btn:hover {
  border-color: var(--cat-color);
}

.category-btn.selected {
  border-color: var(--cat-color);
  background: color-mix(in srgb, var(--cat-color) 10%, white);
}

.cat-icon {
  font-size: 1.25rem;
}

.cat-name {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

/* Toast Notification */
.toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 24px;
  border-radius: 12px;
  font-weight: 500;
  animation: slideUp 0.3s ease, fadeOut 0.3s ease 1.2s forwards;
  z-index: 3000;
}

.toast.success {
  background: #D1FAE5;
  color: #059669;
  border: 1px solid #10B981;
}

.toast-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #10B981;
  color: white;
  border-radius: 50%;
  font-size: 0.875rem;
  font-weight: 700;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes fadeOut {
  to {
    opacity: 0;
  }
}
</style>
