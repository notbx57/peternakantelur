import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to Python script and models
const MODELS_DIR = path.join(__dirname, '../../../models');
const PREDICT_SCRIPT = path.join(MODELS_DIR, 'predict_anomaly.py');

// Semua routes butuh authentication
router.use(isAuthenticated);

/**
 * Call Python ML model for prediction
 * @param {Object} data - Transaction data to predict
 * @returns {Promise<Object>} - Prediction result
 */
async function callPythonModel(data) {
    return new Promise((resolve, reject) => {
        const python = spawn('python', [PREDICT_SCRIPT], {
            cwd: MODELS_DIR
        });

        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        python.on('close', (code) => {
            if (code !== 0) {
                console.error('Python stderr:', stderr);
                reject(new Error(`Python process exited with code ${code}: ${stderr}`));
            } else {
                try {
                    const result = JSON.parse(stdout);
                    resolve(result);
                } catch (e) {
                    reject(new Error(`Failed to parse Python output: ${stdout}`));
                }
            }
        });

        python.on('error', (err) => {
            reject(err);
        });

        // Send input data to Python
        python.stdin.write(JSON.stringify(data));
        python.stdin.end();
    });
}

/**
 * POST /api/anomaly/detect
 * Deteksi anomali pada satu transaksi menggunakan ML model
 */
router.post('/detect', async (req, res) => {
    try {
        const { amount, type, category, date, description, farm_id } = req.body;

        // Validasi input
        if (!amount || !type || !category || !date) {
            return res.status(400).json({
                error: 'Missing required fields: amount, type, category, date'
            });
        }

        const txData = {
            amount: Number(amount),
            type,
            category,
            date: Number(date),
            description: description || '',
            farm_id: farm_id || 'KANDANG1'
        };

        try {
            // Try ML model first
            const result = await callPythonModel(txData);
            res.json(result);
        } catch (mlError) {
            console.warn('ML model failed, using rule-based fallback:', mlError.message);
            // Fallback to rule-based
            const result = detectAnomalyRuleBased(txData);
            res.json(result);
        }
    } catch (error) {
        console.error('Anomaly detection error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/anomaly/batch
 * Deteksi anomali untuk batch transaksi menggunakan ML model
 */
router.post('/batch', async (req, res) => {
    try {
        const { transactions } = req.body;

        if (!transactions || !Array.isArray(transactions)) {
            return res.status(400).json({ error: 'transactions array required' });
        }

        try {
            // Try ML model for batch
            const result = await callPythonModel({ transactions });
            res.json(result);
        } catch (mlError) {
            console.warn('ML model failed, using rule-based fallback:', mlError.message);

            // Fallback to rule-based
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

            const anomalies = results.filter(r => r.anomaly.is_anomaly);

            res.json({
                total: results.length,
                anomaly_count: anomalies.length,
                anomaly_percentage: (anomalies.length / results.length * 100).toFixed(2),
                transactions: results
            });
        }
    } catch (error) {
        console.error('Batch anomaly detection error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Rule-based anomaly detection (fallback)
 * Used when Python ML model is not available
 */
function detectAnomalyRuleBased(transaction) {
    const { amount, type, category, date } = transaction;

    const anomaly_reasons = [];
    let confidence = 0;

    const expenseCategories = [
        'Pakan', 'Obat & Vaksin', 'Gas Elpiji', 'Peralatan', 'Transportasi',
        'Admin Bank', 'Listrik', 'Gaji Karyawan', 'Lain-lain', 'Pembangunan', 'Pullet/DOC'
    ];

    const incomeCategories = [
        'Penjualan Telur', 'Penjualan Ayam', 'Investasi', 'Bunga Bank', 'Lainnya'
    ];

    // 1. Category-Type Mismatch
    if (expenseCategories.includes(category) && type === 'income') {
        anomaly_reasons.push('category_mismatch');
        confidence += 0.4;
    }
    if (incomeCategories.includes(category) && type === 'expense') {
        anomaly_reasons.push('category_mismatch');
        confidence += 0.4;
    }

    // 2. Time Pattern - transaksi tengah malam (12am - 4am)
    const txDate = new Date(date);
    const hour = txDate.getHours();
    if (hour >= 0 && hour <= 4) {
        anomaly_reasons.push('time_pattern');
        confidence += 0.5;
    }

    // 3. Amount Outlier Detection
    const amountThresholds = {
        'Pullet/DOC': 100000000,
        'Pembangunan': 100000000,
        'Investasi': 200000000,
        'Penjualan Telur': 10000000,
        'Penjualan Ayam': 10000000,
        'Bunga Bank': 15000,
        'Admin Bank': 50000
    };

    if (amountThresholds[category] && amount > amountThresholds[category]) {
        anomaly_reasons.push('amount_outlier');
        confidence += 0.4;
    }

    // Normalize confidence
    confidence = Math.min(confidence, 1);

    return {
        is_anomaly: anomaly_reasons.length > 0,
        confidence: parseFloat(confidence.toFixed(3)),
        anomaly_reasons: [...new Set(anomaly_reasons)]
    };
}

export default router;

