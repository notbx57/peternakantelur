import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const router = express.Router();

// Initialize Convex client (lazy loading)
let convex = null;
function getConvexClient() {
    if (!convex) {
        const convexUrl = process.env.CONVEX_URL;
        if (!convexUrl) {
            throw new Error('CONVEX_URL tidak ditemukan di environment variables');
        }
        convex = new ConvexHttpClient(convexUrl);
    }
    return convex;
}

import { isAuthenticated } from '../middleware/auth.js';

// Validasi password - min 8 char dengan special character
function validatePassword(password) {
    if (password.length < 8) {
        return { valid: false, message: 'Password minimal 8 karakter' };
    }

    // Cek ada special character
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    if (!specialCharRegex.test(password)) {
        return { valid: false, message: 'Password harus mengandung minimal 1 karakter spesial (!@#$%^&* dll)' };
    }

    return { valid: true };
}

// Cek Username Availability
router.get('/check-username/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const client = getConvexClient();
        const user = await client.query(api.users.getByUsername, { username });
        res.json({ available: !user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// REGISTER - Daftar akun baru
router.post('/register', async (req, res) => {
    try {
        const { email, username, name, password } = req.body;

        // Validasi input
        if (!email || !username || !name || !password) {
            return res.status(400).json({ error: 'Semua field harus diisi' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Format email tidak valid' });
        }

        // Validate username (alphanumeric + underscore, 3-20 char)
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                error: 'Username harus 3-20 karakter, hanya huruf, angka, dan underscore'
            });
        }

        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({ error: passwordValidation.message });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user di Convex
        const client = getConvexClient();
        const userId = await client.mutation(api.users.create, {
            email,
            username,
            name,
            passwordHash
        });

        // Generate JWT token - tidak ada global role lagi!
        const token = jwt.sign(
            {
                userId,
                email,
                username,
                name
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Registrasi berhasil!',
            token,
            user: {
                userId,
                email,
                username,
                name
            }
        });

    } catch (error) {
        console.error('Register error:', error);

        // Handle specific Convex errors
        if (error.message.includes('Email sudah terdaftar')) {
            return res.status(409).json({ error: 'Email sudah terdaftar' });
        }
        if (error.message.includes('Username sudah dipakai')) {
            return res.status(409).json({ error: 'Username sudah dipakai' });
        }

        res.status(500).json({ error: 'Gagal registrasi. Coba lagi nanti.' });
    }
});

// LOGIN - Masuk pake email/username + password
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body; // identifier bisa email atau username

        if (!identifier || !password) {
            return res.status(400).json({ error: 'Email/username dan password harus diisi' });
        }

        const client = getConvexClient();

        // Cek apakah identifier itu email atau username
        const isEmail = identifier.includes('@');

        let user;
        if (isEmail) {
            user = await client.query(api.users.getByEmail, { email: identifier });
        } else {
            user = await client.query(api.users.getByUsername, { username: identifier });
        }

        if (!user) {
            return res.status(401).json({ error: 'Email/username atau password salah' });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Email/username atau password salah' });
        }

        // Generate JWT token - tidak ada global role!
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                username: user.username,
                name: user.name
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login berhasil!',
            token,
            user: {
                userId: user._id,
                email: user.email,
                username: user.username,
                name: user.name,
                avatar: user.avatar || null
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Gagal login. Coba lagi nanti.' });
    }
});

// Route buat verify JWT token (buat client-side auth)
router.post('/verify', (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ valid: true, user: decoded });
    } catch (error) {
        res.status(401).json({ valid: false, error: 'Invalid atau expired token' });
    }
});

// Route buat cek current user (dengan Bearer token)
router.get('/me', isAuthenticated, (req, res) => {
    res.json(req.user);
});

// Logout (client-side cukup hapus token, tapi kita kasih endpoint buat consistency)
router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Logout berhasil!' });
});

export default router;
