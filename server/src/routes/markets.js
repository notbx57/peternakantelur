import express from 'express';
import { api } from '../../convex/_generated/api.js';
import convex from '../config/convex.js';

import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Semua rute market butuh login
router.use(isAuthenticated);

// ============ MARKET CRUD ============

// Ambil semua market yang aktif (global list)
// Endpoint ini ga perlu login, siapa aja bisa liat
router.get('/', async (req, res) => {
    try {
        const markets = await convex.query(api.markets.getMarkets, {});
        res.json(markets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ambil market milik user tertentu
router.get('/my', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }
        const markets = await convex.query(api.markets.getMyMarkets, { userId });
        res.json(markets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cek berapa market yang dimiliki user & bisa bikin lagi atau engga
router.get('/count', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }
        const result = await convex.query(api.markets.getMarketCount, { userId });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cek apakah handle tersedia
router.get('/check-handle', async (req, res) => {
    try {
        const { handle } = req.query;
        if (!handle) {
            return res.status(400).json({ error: 'handle required' });
        }
        const result = await convex.query(api.markets.checkHandleAvailable, { handle });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ambil market by handle (@name) - harus sebelum /:id biar ga conflict
router.get('/h/:handle', async (req, res) => {
    try {
        const market = await convex.query(api.markets.getMarketByHandle, {
            handle: req.params.handle
        });
        if (!market) {
            return res.status(404).json({ error: 'Market tidak ditemukan' });
        }
        res.json(market);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ambil detail satu market by ID
router.get('/:id', async (req, res) => {
    try {
        const market = await convex.query(api.markets.getMarketById, {
            marketId: req.params.id
        });
        if (!market) {
            return res.status(404).json({ error: 'Market tidak ditemukan' });
        }
        res.json(market);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ambil role user di market (owner/investor/etc)
router.get('/:id/role', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }
        const role = await convex.query(api.kandang.getUserRoleInMarket, {
            marketId: req.params.id,
            userId
        });
        res.json({ role });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ambil list member market (Owner + Co-owners + Investors)
router.get('/:id/members', async (req, res) => {
    try {
        const members = await convex.query(api.markets.getMarketMembers, {
            marketId: req.params.id
        });
        res.json(members);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Invite member sebagai co-owner (langsung ditambahkan tanpa approval)
router.post('/:id/members', async (req, res) => {
    try {
        const { userId, invitedBy } = req.body;
        if (!userId || !invitedBy) {
            return res.status(400).json({ error: 'userId dan invitedBy required' });
        }

        await convex.mutation(api.markets.addCoOwner, {
            marketId: req.params.id,
            userId,
            invitedBy
        });

        res.json({ success: true });
    } catch (error) {
        // Handle errors dari convex
        if (error.message.includes('Hanya head owner') ||
            error.message.includes('Tidak bisa invite') ||
            error.message.includes('sudah menjadi')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

// Bikin market baru
// Max 2 market per user
router.post('/', async (req, res) => {
    try {
        const { name, handle, description, logo, userId } = req.body;
        if (!name || !handle || !userId) {
            return res.status(400).json({ error: 'name, handle, dan userId required' });
        }
        const marketId = await convex.mutation(api.markets.createMarket, {
            name,
            handle,
            description,
            logo,
            userId
        });
        res.json({ _id: marketId });
    } catch (error) {
        // Handle errors dari convex (max 2, handle taken, etc)
        if (error.message.includes('Maksimal 2') ||
            error.message.includes('Handle sudah dipakai') ||
            error.message.includes('Handle hanya boleh') ||
            error.message.includes('Handle minimal') ||
            error.message.includes('Handle maksimal')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

// Generate upload URL untuk image market
router.post('/upload-url', async (req, res) => {
    try {
        const uploadUrl = await convex.mutation(api.markets.generateUploadUrl, {});
        res.json({ uploadUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update market (hanya owner)
router.put('/:id', async (req, res) => {
    try {
        const { name, handle, description, logo, logoStorageId, isActive, userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }
        const marketId = await convex.mutation(api.markets.updateMarket, {
            marketId: req.params.id,
            name,
            handle,
            description,
            logo,
            logoStorageId,
            isActive,
            userId
        });
        res.json({ _id: marketId });
    } catch (error) {
        if (error.message.includes('Hanya owner') ||
            error.message.includes('Handle sudah dipakai') ||
            error.message.includes('Handle hanya boleh') ||
            error.message.includes('Handle minimal') ||
            error.message.includes('Handle maksimal')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

// Partial update market (toggle status, etc) - PATCH endpoint
router.patch('/:id', async (req, res) => {
    try {
        const { isActive, userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }
        const marketId = await convex.mutation(api.markets.updateMarket, {
            marketId: req.params.id,
            isActive,
            userId
        });
        res.json({ _id: marketId, isActive });
    } catch (error) {
        if (error.message.includes('Hanya owner')) {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

// Hapus market (soft delete, hanya owner)
router.delete('/:id', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }
        await convex.mutation(api.markets.deleteMarket, {
            marketId: req.params.id,
            userId
        });
        res.json({ success: true });
    } catch (error) {
        if (error.message.includes('Hanya owner')) {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

export default router;
