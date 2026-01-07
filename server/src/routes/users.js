import express from 'express';
import { api } from '../../convex/_generated/api.js';
import convex from '../config/convex.js';

import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Semua rute user butuh login
router.use(isAuthenticated);

// ============ USER MANAGEMENT ============

// Ambil semua user - buat dropdown pilih member
router.get('/', async (req, res) => {
    try {
        const users = await convex.query(api.users.listAll);
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search users by username - buat dropdown invite member
router.get('/search', async (req, res) => {
    try {
        const { term, limit, excludeUserId } = req.query;
        if (!term || term.length < 1) {
            return res.json([]);
        }
        const users = await convex.query(api.users.searchByUsername, {
            term,
            limit: limit ? parseInt(limit) : 10,
            excludeUserId: excludeUserId || undefined
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get or create user - dipake buat OAuth flow
// Kalo user udah ada, return yang lama. Kalo belum, bikin baru
router.post('/upsert', async (req, res) => {
    try {
        const { email, name, googleId, avatar } = req.body;
        const userId = await convex.mutation(api.users.upsert, {
            email,
            name,
            googleId,
            avatar
        });
        const user = await convex.query(api.users.get, { id: userId });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cari user berdasarkan email
router.get('/by-email/:email', async (req, res) => {
    try {
        const user = await convex.query(api.users.getByEmail, {
            email: req.params.email
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update profile user (nama, avatar, nomor HP)
// Ini BUKAN buat update role ya! Role ada endpoint sendiri
router.patch('/profile', async (req, res) => {
    try {
        const { userId, name, avatar, phoneNumber } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }
        const result = await convex.mutation(api.users.updateProfile, {
            userId,
            name,
            avatar,
            phoneNumber
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update role user secara global (bukan per-kandang)
// Ini endpoint admin level, bisa ubah role siapa aja
router.patch('/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({ error: 'role required' });
        }
        await convex.mutation(api.users.updateRole, {
            userId: req.params.id,
            role
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate upload URL buat upload avatar ke Convex storage
// Client upload file kesini dulu, baru update avatar pake storageId
router.post('/avatar/upload-url', async (req, res) => {
    try {
        const uploadUrl = await convex.mutation(api.users.generateUploadUrl);
        res.json({ uploadUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update avatar pake storageId dari hasil upload
// Dipanggil setelah file berhasil diupload ke Convex
router.patch('/avatar', async (req, res) => {
    try {
        const { userId, storageId } = req.body;
        if (!userId || !storageId) {
            return res.status(400).json({ error: 'userId and storageId required' });
        }
        const result = await convex.mutation(api.users.updateAvatar, {
            userId,
            storageId
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
