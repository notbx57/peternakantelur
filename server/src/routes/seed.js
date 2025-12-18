import express from 'express';
import { api } from '../../convex/_generated/api.js';
import convex from '../config/convex.js';

const router = express.Router();

// ============ SEED DATA ============

// Seed semua data (user, categories, kandang, transactions)
// Dipake pas setup development environment
// JANGAN dipanggil di production!
router.post('/', async (req, res) => {
    try {
        const result = await convex.mutation(api.seed.seedAll);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cek status seeding - udah di-seed atau belum
router.get('/status', async (req, res) => {
    try {
        const status = await convex.query(api.seed.getSeedStatus);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
