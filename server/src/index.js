import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import route modules
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import kandangRoutes from './routes/kandang.js';
import transactionsRoutes from './routes/transactions.js';
import categoriesRoutes from './routes/categories.js';
import marketsRoutes from './routes/markets.js';

import dashboardRoutes from './routes/dashboard.js';
import seedRoutes from './routes/seed.js';
import anomalyRoutes from './routes/anomaly.js';

// Import error handler
import { errorHandler } from './middleware/errorHandler.js';

// Load environment variables dari .env.local
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// ============ MIDDLEWARE ============

// CORS - biar frontend bisa hit API dari domain lain
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3001'],
  credentials: true
}));

// Body parser - biar bisa baca JSON dari request body
app.use(express.json());

// ============ HEALTH CHECK ============

// Endpoint buat cek server masih hidup apa ngga
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '🐔 Peternakantelur API running' });
});

// ============ ROUTE MOUNTING ============

// Auth routes - register, login, dll
app.use('/auth', authRoutes);

// User routes - manage users, profile, avatar
app.use('/api/users', usersRoutes);

// Kandang routes - CRUD kandang & member management
app.use('/api/kandang', kandangRoutes);

// Transaction routes - CRUD transactions
app.use('/api/transactions', transactionsRoutes);

// Category routes - list & seed categories
app.use('/api/categories', categoriesRoutes);

// Market routes - CRUD markets
app.use('/api/markets', marketsRoutes);
// Dashboard routes - dashboard stats per kandang
app.use('/api/dashboard', dashboardRoutes);

// Seed routes - seeding data development
app.use('/api/seed', seedRoutes);

// Anomaly detection routes - ML-powered anomaly detection API
app.use('/api/anomaly', anomalyRoutes);

// ============ ERROR HANDLING ============

// Centralized error handler - semua error lewat sini
app.use(errorHandler);

// ============ START SERVER ============

// ============ START SERVER ============

// Only listen if running locally/directly (not imported as a module)
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`🐔 Server running on http://localhost:${PORT}`);
    console.log(`📡 API ready to serve requests`);
  });
}

export default app;
