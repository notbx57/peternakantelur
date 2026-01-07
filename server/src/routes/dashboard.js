import express from 'express';
import { api } from '../../convex/_generated/api.js';
import convex from '../config/convex.js';

import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Semua rute dashboard butuh login
router.use(isAuthenticated);

// ============ DASHBOARD ============

// Ambil data dashboard untuk kandang
// Returns: total income, expense, balance, dan stats lainnya
router.get('/:kandangId', async (req, res) => {
    try {
        const dashboard = await convex.query(api.transactions.getDashboard, {
            kandangId: req.params.kandangId
        });
        res.json(dashboard);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
