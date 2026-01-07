import express from 'express';
import { api } from '../../convex/_generated/api.js';
import convex from '../config/convex.js';

import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Semua rute transaksi butuh login
router.use(isAuthenticated);

// ============ TRANSACTIONS ============

// Ambil single transaction by ID
router.get('/:txId', async (req, res) => {
    try {
        const transaction = await convex.query(api.transactions.get, {
            id: req.params.txId
        });
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ambil semua transaksi untuk kandang tertentu
// Bisa filter by category, type, date range, dan search
router.get('/kandang/:id', async (req, res) => {
    try {
        const { categoryId, type, startDate, endDate, search, limit } = req.query;
        const transactions = await convex.query(api.transactions.list, {
            kandangId: req.params.id,
            categoryId: categoryId || undefined,
            type: type || undefined,
            startDate: startDate ? Number(startDate) : undefined,
            endDate: endDate ? Number(endDate) : undefined,
            search: search || undefined,
            limit: limit ? Number(limit) : undefined
        });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bikin transaksi baru
// Type bisa "income" atau "expense"
router.post('/kandang/:id', async (req, res) => {
    try {
        const { categoryId, categoryName, createdBy, amount, type, description, date } = req.body;
        const txId = await convex.mutation(api.transactions.create, {
            kandangId: req.params.id,
            categoryId,
            categoryName: categoryName || 'Lain-lain', // Default kalo kosong
            createdBy,
            amount: Number(amount),
            type,
            description,
            date: Number(date)
        });
        res.json({ _id: txId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update transaksi (full update pake PUT)
// Semua field harus dikirim
router.put('/kandang/:id/:txId', async (req, res) => {
    try {
        const { categoryId, categoryName, amount, type, description, date } = req.body;
        await convex.mutation(api.transactions.update, {
            id: req.params.txId,
            categoryId,
            categoryName,
            amount: amount ? Number(amount) : undefined,
            type,
            description,
            date: date ? Number(date) : undefined
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update transaksi (partial update pake PATCH)
// Cuma kirim field yang mau diubah aja
router.patch('/kandang/:id/:txId', async (req, res) => {
    try {
        const { categoryId, amount, type, description, date } = req.body;
        await convex.mutation(api.transactions.update, {
            id: req.params.txId,
            categoryId: categoryId || undefined,
            amount: amount !== undefined ? Number(amount) : undefined,
            type: type || undefined,
            description: description || undefined,
            date: date !== undefined ? Number(date) : undefined
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete transaksi
router.delete('/kandang/:id/:txId', async (req, res) => {
    try {
        await convex.mutation(api.transactions.remove, { id: req.params.txId });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
