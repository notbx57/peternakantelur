import express from 'express';
import { api } from '../../convex/_generated/api.js';
import convex from '../config/convex.js';

const router = express.Router();

// ============ NOTIFICATIONS ============

// Ambil semua notif untuk user
router.get('/', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }
        const notifications = await convex.query(api.notifications.listForUser, { userId });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Hitung berapa notif yang belum dibaca
// Buat badge counter di navbar
router.get('/unread-count', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }
        const count = await convex.query(api.notifications.countUnread, { userId });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Request buat jadi investor di kandang
// Bikin notif ke head owner kandang
router.post('/request-investor', async (req, res) => {
    try {
        const { userId, kandangId } = req.body;
        const result = await convex.mutation(api.notifications.requestInvestor, {
            userId,
            kandangId
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Accept request investor
// Head owner terima request, user jadi investor di kandang
router.post('/:id/accept', async (req, res) => {
    try {
        const { headOwnerId } = req.body;
        const result = await convex.mutation(api.notifications.acceptRequest, {
            notificationId: req.params.id,
            headOwnerId
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reject request investor
// Head owner tolak request
router.post('/:id/reject', async (req, res) => {
    try {
        const { headOwnerId } = req.body;
        const result = await convex.mutation(api.notifications.rejectRequest, {
            notificationId: req.params.id,
            headOwnerId
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark satu notif sebagai read
router.patch('/:id/read', async (req, res) => {
    try {
        await convex.mutation(api.notifications.markAsRead, {
            notificationId: req.params.id
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark semua notif sebagai read
// Dipake waktu user klik "Mark all as read"
router.patch('/read-all', async (req, res) => {
    try {
        const { userId } = req.body;
        const result = await convex.mutation(api.notifications.markAllAsRead, { userId });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
