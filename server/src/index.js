import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';
import authRoutes from './routes/auth.js';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Convex client
const convexUrl = process.env.CONVEX_URL;
if (!convexUrl) {
  console.error('❌ CONVEX_URL not found in .env.local');
  process.exit(1);
}
const convex = new ConvexHttpClient(convexUrl);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Auth routes
app.use('/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '🐔 Peternakantelur API running' });
});

// ============ USERS ============

// Update user role globally
app.patch('/api/users/:id/role', async (req, res) => {
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

// ============ CATEGORIES ============

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await convex.query(api.categories.list);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Seed default categories
app.post('/api/categories/seed', async (req, res) => {
  try {
    const result = await convex.mutation(api.categories.seedDefaults);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ KANDANG ============

// Get all kandang (public) - for users to browse and request access
app.get('/api/kandang/public', async (req, res) => {
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

// List kandang for user
app.get('/api/kandang', async (req, res) => {
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

// Get single kandang with head owner info
app.get('/api/kandang/:id', async (req, res) => {
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

// Create kandang
app.post('/api/kandang', async (req, res) => {
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

// Get kandang members
app.get('/api/kandang/:id/members', async (req, res) => {
  try {
    const members = await convex.query(api.kandang.getMembers, {
      kandangId: req.params.id
    });
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add member to kandang
app.post('/api/kandang/:id/members', async (req, res) => {
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

// Update member role (co_owner <-> investor)
app.patch('/api/kandang/:id/members/:userId', async (req, res) => {
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

// Remove member from kandang
app.delete('/api/kandang/:id/members/:userId', async (req, res) => {
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

// Get user role in specific kandang
// Returns: head_owner, co_owner, investor, or null (no access)
app.get('/api/kandang/:id/user-role', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Check if head owner
    const kandang = await convex.query(api.kandang.getWithOwner, {
      id: req.params.id
    });

    if (!kandang) {
      return res.status(404).json({ error: 'Kandang tidak ditemukan' });
    }

    if (String(kandang.headOwnerId) === String(userId)) {
      return res.json({ role: 'head_owner' });
    }

    // Check membership
    const members = await convex.query(api.kandang.getMembers, {
      kandangId: req.params.id
    });

    const membership = members.find(m => m.user?._id === userId);
    if (membership) {
      return res.json({ role: membership.role });
    }

    // Check global role from users table
    const user = await convex.query(api.users.get, { id: userId });
    if (user && (user.role === 'investor' || user.role === 'head_owner' || user.role === 'co_owner')) {
      return res.json({ role: user.role });
    }

    // No access
    return res.json({ role: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ TRANSACTIONS ============

// Get transactions for kandang
app.get('/api/kandang/:id/transactions', async (req, res) => {
  try {
    const { categoryId, type, startDate, endDate, search, limit } = req.query;
    const transactions = await convex.query(api.transactions.list, {
      kandangId: req.params.id,
      categoryId: categoryId || undefined,
      type: type || undefined,
      startDate: startDate ? Number(startDate) : undefined,
      endDate: endDate ? Number(endDate) : undefined,
      search: search || undefined,
      limit: limit ? Number(limit) : undefined
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create transaction
app.post('/api/kandang/:id/transactions', async (req, res) => {
  try {
    const { categoryId, createdBy, amount, type, description, date } = req.body;
    const txId = await convex.mutation(api.transactions.create, {
      kandangId: req.params.id,
      categoryId,
      createdBy,
      amount: Number(amount),
      type,
      description,
      date: Number(date)
    });
    res.json({ _id: txId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update transaction
app.put('/api/kandang/:id/transactions/:txId', async (req, res) => {
  try {
    const { categoryId, amount, type, description, date } = req.body;
    await convex.mutation(api.transactions.update, {
      id: req.params.txId,
      categoryId,
      amount: amount ? Number(amount) : undefined,
      type,
      description,
      date: date ? Number(date) : undefined
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete transaction
app.delete('/api/kandang/:id/transactions/:txId', async (req, res) => {
  try {
    await convex.mutation(api.transactions.remove, { id: req.params.txId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DASHBOARD ============

// Get dashboard for kandang
app.get('/api/kandang/:id/dashboard', async (req, res) => {
  try {
    const dashboard = await convex.query(api.transactions.getDashboard, {
      kandangId: req.params.id
    });
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ USERS ============

// Get all users - buat dropdown pilih member
app.get('/api/users', async (req, res) => {
  try {
    const users = await convex.query(api.users.listAll);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get or create user (for OAuth)
app.post('/api/users/upsert', async (req, res) => {
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

// Get user by email
app.get('/api/users/by-email/:email', async (req, res) => {
  try {
    const user = await convex.query(api.users.getByEmail, {
      email: req.params.email
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile (name, avatar, phoneNumber - NOT role)
app.patch('/api/users/profile', async (req, res) => {
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

// Generate upload URL for avatar
app.post('/api/users/avatar/upload-url', async (req, res) => {
  try {
    const uploadUrl = await convex.mutation(api.users.generateUploadUrl);
    res.json({ uploadUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update avatar with storage ID
app.patch('/api/users/avatar', async (req, res) => {
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

// ============ SEED ============

// Seed all data (user, categories, kandang, transactions)
app.post('/api/seed', async (req, res) => {
  try {
    const result = await convex.mutation(api.seed.seedAll);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get seed status
app.get('/api/seed/status', async (req, res) => {
  try {
    const status = await convex.query(api.seed.getSeedStatus);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ADDITIONAL ROUTES ============

// Get single transaction
app.get('/api/transactions/:txId', async (req, res) => {
  try {
    const transaction = await convex.query(api.transactions.get, {
      id: req.params.txId
    });
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH transaction (partial update)
app.patch('/api/kandang/:id/transactions/:txId', async (req, res) => {
  try {
    const { categoryId, amount, type, description, date } = req.body;
    await convex.mutation(api.transactions.update, {
      id: req.params.txId,
      categoryId: categoryId || undefined,
      amount: amount !== undefined ? Number(amount) : undefined,
      type: type || undefined,
      description: description || undefined,
      date: date !== undefined ? Number(date) : undefined
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ NOTIFICATIONS ============

// Get notifications for user
app.get('/api/notifications', async (req, res) => {
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

// Get unread notification count
app.get('/api/notifications/unread-count', async (req, res) => {
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

// Request to become investor
app.post('/api/notifications/request-investor', async (req, res) => {
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

// Accept investor request
app.post('/api/notifications/:id/accept', async (req, res) => {
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

// Reject investor request
app.post('/api/notifications/:id/reject', async (req, res) => {
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

// Mark notification as read
app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    await convex.mutation(api.notifications.markAsRead, {
      notificationId: req.params.id
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read
app.patch('/api/notifications/read-all', async (req, res) => {
  try {
    const { userId } = req.body;
    const result = await convex.mutation(api.notifications.markAllAsRead, { userId });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ADDITIONAL ROUTES ============

// Start server
app.listen(PORT, () => {
  console.log(`🐔 Server running on http://localhost:${PORT}`);
  console.log(`📡 Connected to Convex: ${convexUrl}`);
});
