import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Semua routes butuh authentication
router.use(isAuthenticated);

/**
 * POST /api/anomaly/detect
 * Deteksi anomali pada satu transaksi
 * 
 * Body: {
 *   amount: number,
 *   type: 'income' | 'expense',
 *   category: string,
 *   date: number (timestamp ms),
 *   description?: string
 * }
 * 
 * Response: {
 *   is_anomaly: boolean,
 *   confidence: number (0-1),
 *   anomaly_reasons: string[]
 * }
 */
router.post('/detect', async (req, res) => {
    try {
        const { amount, type, category, date, description } = req.body;

        // Validasi input
        if (!amount || !type || !category || !date) {
            return res.status(400).json({
                error: 'Missing required fields: amount, type, category, date'
            });
        }

        // Langsung cek rule-based dulu buat response cepat
        const result = detectAnomalyRuleBased({
            amount: Number(amount),
            type,
            category,
            date: Number(date),
            description: description || ''
        });

        res.json(result);
    } catch (error) {
        console.error('Anomaly detection error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/anomaly/batch
 * Deteksi anomali untuk batch transaksi
 * 
 * Body: {
 *   transactions: Array<{amount, type, category, date, description}>
 * }
 */
router.post('/batch', async (req, res) => {
    try {
        const { transactions } = req.body;

        if (!transactions || !Array.isArray(transactions)) {
            return res.status(400).json({ error: 'transactions array required' });
        }

        const results = transactions.map(tx => ({
            ...tx,
            anomaly: detectAnomalyRuleBased({
                amount: Number(tx.amount),
                type: tx.type,
                category: tx.category,
                date: Number(tx.date),
                description: tx.description || ''
            })
        }));

        // Summary
        const anomalies = results.filter(r => r.anomaly.is_anomaly);

        res.json({
            total: results.length,
            anomaly_count: anomalies.length,
            anomaly_percentage: (anomalies.length / results.length * 100).toFixed(2),
            transactions: results
        });
    } catch (error) {
        console.error('Batch anomaly detection error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Rule-based anomaly detection
 * Ini implementasi pure JS yang mirror logic dari ML model
 * Buat production tanpa Python dependency
 */
function detectAnomalyRuleBased(transaction) {
    const { amount, type, category, date, description } = transaction;

    const anomaly_reasons = [];
    let confidence = 0;

    // Kategori yang biasanya expense (updated untuk dataset Sep 2025 - Jan 2026)
    const expenseCategories = [
        'Pakan',
        'Obat & Vaksin',
        'Gas Elpiji',
        'Peralatan',
        'Transportasi',
        'Admin Bank',
        'Listrik',
        'Gaji Karyawan',
        'Lain-lain',
        'Pembangunan',  // NEW
        'Pullet/DOC'    // NEW
    ];

    // Kategori yang biasanya income (updated untuk dataset Sep 2025 - Jan 2026)
    const incomeCategories = [
        'Penjualan Telur',
        'Penjualan Ayam',
        'Penjualan Pupuk',
        'Investasi',
        'Bunga Bank',   // NEW
        'Lainnya'       // NEW
    ];

    // 1. Category-Type Mismatch Detection
    // Kategori expense tapi type income = suspicious
    const isExpenseCategory = expenseCategories.includes(category);
    const isIncomeCategory = incomeCategories.includes(category);

    if (isExpenseCategory && type === 'income') {
        anomaly_reasons.push('category_mismatch');
        confidence += 0.4;
    }

    if (isIncomeCategory && type === 'expense') {
        anomaly_reasons.push('category_mismatch');
        confidence += 0.4;
    }

    // 2. Amount Outlier Detection
    // Threshold berdasarkan kategori (updated untuk dataset Sep 2025 - Jan 2026)
    const amountThresholds = {
        'Pakan': { min: 100000, max: 50000000 },
        'Obat & Vaksin': { min: 50000, max: 30000000 },
        'Gas Elpiji': { min: 50000, max: 5000000 },
        'Peralatan': { min: 50000, max: 20000000 },
        'Transportasi': { min: 50000, max: 5000000 },
        'Admin Bank': { min: 1000, max: 50000 },
        'Penjualan Telur': { min: 100000, max: 10000000 },      // Updated from dataset
        'Penjualan Ayam': { min: 100000, max: 10000000 },       // Updated from dataset
        'Lain-lain': { min: 1000, max: 50000000 },
        'Pembangunan': { min: 1000000, max: 100000000 },        // NEW from dataset
        'Pullet/DOC': { min: 1000000, max: 100000000 },         // NEW from dataset
        'Investasi': { min: 10000000, max: 200000000 },         // NEW from dataset
        'Bunga Bank': { min: 100, max: 15000 },                 // NEW from dataset
        'Listrik': { min: 100000, max: 10000000 },              // NEW
        'Gaji Karyawan': { min: 1000000, max: 30000000 },       // NEW
        'Lainnya': { min: 100000, max: 50000000 },              // NEW
        'default': { min: 1000, max: 100000000 }
    };

    const threshold = amountThresholds[category] || amountThresholds['default'];

    // Cek extreme outlier (sangat jauh dari threshold)
    if (amount > threshold.max * 10 || amount < threshold.min / 10) {
        anomaly_reasons.push('amount_outlier');
        confidence += 0.5;
    } else if (amount > threshold.max || amount < threshold.min) {
        // Outlier tapi ga terlalu ekstrem
        if (!anomaly_reasons.includes('amount_outlier')) {
            anomaly_reasons.push('amount_suspicious');
            confidence += 0.2;
        }
    }

    // 3. Admin Bank amount check (harusnya kecil)
    if (category === 'Admin Bank' && amount > 100000) {
        anomaly_reasons.push('amount_outlier');
        confidence += 0.3;
    }

    // 4. Rare income from expense categories
    if (isExpenseCategory && type === 'income' && !anomaly_reasons.includes('category_mismatch')) {
        anomaly_reasons.push('rare_income');
        confidence += 0.3;
    }

    // Normalize confidence to 0-1
    confidence = Math.min(confidence, 1);

    // Determine if anomaly based on confidence threshold
    const is_anomaly = confidence >= 0.3 || anomaly_reasons.length > 0;

    return {
        is_anomaly,
        confidence: parseFloat(confidence.toFixed(3)),
        anomaly_reasons: [...new Set(anomaly_reasons)] // Remove duplicates
    };
}

export default router;
