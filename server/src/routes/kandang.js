import express from 'express';
import { api } from '../../convex/_generated/api.js';
import convex from '../config/convex.js';

const router = express.Router();

// ============ KANDANG MANAGEMENT ============

// Ambil semua kandang yang public - buat browse dan request akses
// Endpoint ini ga perlu login, siapa aja bisa liat
router.get('/public', async (req, res) => {
    try {
        const { userId } = req.query;
        const kandangList = await convex.query(api.kandang.listAllPublic, {
            userId: userId || undefined
        });
        res.json(kandangList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ambil kandang yang user punya akses
// Ini yg kepake di dashboard dropdown
router.get('/', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }
        const kandangList = await convex.query(api.kandang.listForUser, { userId });
        res.json(kandangList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ambil detail satu kandang beserta info head owner
router.get('/:id', async (req, res) => {
    try {
        const kandang = await convex.query(api.kandang.getWithOwner, {
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

// Bikin kandang baru
// Otomatis yang bikin jadi head owner
router.post('/', async (req, res) => {
    try {
        const { name, headOwnerId, description } = req.body;
        const kandangId = await convex.mutation(api.kandang.create, {
            name,
            headOwnerId,
            description
        });
        res.json({ _id: kandangId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ MEMBER MANAGEMENT ============

// Ambil semua member dari kandang
router.get('/:id/members', async (req, res) => {
    try {
        const members = await convex.query(api.kandang.getMembers, {
            kandangId: req.params.id
        });
        res.json(members);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Tambahin member baru ke kandang
// Role bisa co_owner atau investor
router.post('/:id/members', async (req, res) => {
    try {
        const { userId, role } = req.body;
        const memberId = await convex.mutation(api.kandang.addMember, {
            kandangId: req.params.id,
            userId,
            role
        });
        res.json({ _id: memberId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update role member (co_owner <-> investor)
// Cuma bisa ubah antara co_owner sama investor aja
// Ga bisa jadiin head_owner, soalnya head_owner cuma 1
router.patch('/:id/members/:userId', async (req, res) => {
    try {
        const { role } = req.body;
        await convex.mutation(api.kandang.updateMemberRole, {
            kandangId: req.params.id,
            userId: req.params.userId,
            role
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Kick member dari kandang
router.delete('/:id/members/:userId', async (req, res) => {
    try {
        await convex.mutation(api.kandang.removeMember, {
            kandangId: req.params.id,
            userId: req.params.userId
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ROLE CHECKING ============

// Cek role user di kandang tertentu
// Returns: head_owner, co_owner, investor, atau null (ga punya akses)
router.get('/:id/user-role', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }

        // Cek apakah user ini head owner kandang
        const kandang = await convex.query(api.kandang.getWithOwner, {
            id: req.params.id
        });

        if (!kandang) {
            return res.status(404).json({ error: 'Kandang tidak ditemukan' });
        }

        // Kalo head owner, langsung return
        if (String(kandang.headOwnerId) === String(userId)) {
            return res.json({ role: 'head_owner' });
        }

        // Cek di membership table
        const members = await convex.query(api.kandang.getMembers, {
            kandangId: req.params.id
        });

        const membership = members.find(m => m.user?._id === userId);
        if (membership) {
            return res.json({ role: membership.role });
        }

        // Cek global role dari users table (fallback)
        const user = await convex.query(api.users.get, { id: userId });
        if (user && (user.role === 'investor' || user.role === 'head_owner' || user.role === 'co_owner')) {
            return res.json({ role: user.role });
        }

        // Ga punya akses sama sekali
        return res.json({ role: null });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
