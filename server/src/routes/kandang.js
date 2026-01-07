import express from 'express';
import { api } from '../../convex/_generated/api.js';
import convex from '../config/convex.js';

import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Semua rute kandang butuh login
router.use(isAuthenticated);

// ============ KANDANG MANAGEMENT ============

// Ambil portfolio investasi user
router.get('/investments', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }
        const investments = await convex.query(api.kandang.getUserInvestments, {
            userId
        });
        res.json(investments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ambil semua kandang dalam market
router.get('/market/:marketId', async (req, res) => {
    try {
        const kandangList = await convex.query(api.kandang.listByMarket, {
            marketId: req.params.marketId
        });
        res.json(kandangList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ambil satu kandang by ID
router.get('/:id', async (req, res) => {
    try {
        const kandang = await convex.query(api.kandang.getWithMarket, {
            id: req.params.id
        });
        if (!kandang) {
            return res.status(404).json({ error: 'Kandang tidak ditemukan' });
        }
        res.json(kandang);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ambil statistik kandang (ROI, profit, prediksi)
router.get('/:id/stats', async (req, res) => {
    try {
        const stats = await convex.query(api.kandang.getKandangStats, {
            kandangId: req.params.id
        });
        if (!stats) {
            return res.status(404).json({ error: 'Kandang tidak ditemukan' });
        }
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bikin kandang baru di dalam market
router.post('/', async (req, res) => {
    try {
        const { name, marketId, description } = req.body;
        if (!name || !marketId) {
            return res.status(400).json({ error: 'name dan marketId required' });
        }
        const kandangId = await convex.mutation(api.kandang.create, {
            name,
            marketId,
            description
        });
        res.json({ _id: kandangId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update kandang
router.put('/:id', async (req, res) => {
    try {
        const { name, description, avatar, avatarStorageId, isActive } = req.body;
        await convex.mutation(api.kandang.update, {
            id: req.params.id,
            name,
            description,
            avatar,
            avatarStorageId,
            isActive
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Hapus kandang
router.delete('/:id', async (req, res) => {
    try {
        await convex.mutation(api.kandang.remove, {
            id: req.params.id
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ INVESTOR MANAGEMENT ============

// Ambil semua investor di kandang
router.get('/:id/investors', async (req, res) => {
    try {
        const investors = await convex.query(api.kandang.getInvestors, {
            kandangId: req.params.id
        });
        res.json(investors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Tambah investor ke kandang
router.post('/:id/investors', async (req, res) => {
    try {
        const { userId, investmentAmount } = req.body;
        if (!userId || !investmentAmount) {
            return res.status(400).json({ error: 'userId dan investmentAmount required' });
        }
        const investorId = await convex.mutation(api.kandang.addInvestor, {
            kandangId: req.params.id,
            userId,
            investmentAmount
        });
        res.json({ _id: investorId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove investor dari kandang
router.delete('/:id/investors/:userId', async (req, res) => {
    try {
        await convex.mutation(api.kandang.removeInvestor, {
            kandangId: req.params.id,
            userId: req.params.userId
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ROLE CHECKING ============

// Cek role user di market
router.get('/role/:marketId', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }
        const role = await convex.query(api.kandang.getUserRoleInMarket, {
            marketId: req.params.marketId,
            userId
        });
        res.json({ role });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
