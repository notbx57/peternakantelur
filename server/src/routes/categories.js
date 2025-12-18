import express from 'express';
import { api } from '../../convex/_generated/api.js';
import convex from '../config/convex.js';

const router = express.Router();

// ============ CATEGORIES ============

// Ambil semua kategori
// Dipake buat dropdown waktu bikin/edit transaksi
router.get('/', async (req, res) => {
    try {
        const categories = await convex.query(api.categories.list);
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Seed kategori default
// Biasanya dipanggil sekali pas setup awal database
router.post('/seed', async (req, res) => {
    try {
        const result = await convex.mutation(api.categories.seedDefaults);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
