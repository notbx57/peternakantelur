import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Ambil daftar transaksi buat satu kandang
// Bisa di-filter pake kategori, tipe, tanggal, atau search
export const list = query({
    args: {
        kandangId: v.id("kandang"),
        categoryId: v.optional(v.id("categories")),
        type: v.optional(v.union(v.literal("income"), v.literal("expense"))),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
        search: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let query = ctx.db
            .query("transactions")
            .withIndex("by_kandang_date", (q) => q.eq("kandangId", args.kandangId))
            .order("desc");

        let results = await query.collect();

        // Filter kategori - kalo mau liat satu jenis doang
        if (args.categoryId) {
            results = results.filter((t) => t.categoryId === args.categoryId);
        }
        // Filter tipe - income atau expense
        if (args.type) {
            results = results.filter((t) => t.type === args.type);
        }
        // Filter tanggal mulai
        if (args.startDate) {
            results = results.filter((t) => t.date >= args.startDate!);
        }
        // Filter tanggal akhir
        if (args.endDate) {
            results = results.filter((t) => t.date <= args.endDate!);
        }
        // Search di deskripsi - case insensitive
        if (args.search) {
            const searchLower = args.search.toLowerCase();
            results = results.filter((t) =>
                t.description.toLowerCase().includes(searchLower)
            );
        }

        // Limit hasilnya - buat paging atau dashboard
        if (args.limit) {
            results = results.slice(0, args.limit);
        }

        // Tambahin info kategori ke setiap transaksi biar ga perlu query lagi
        const withCategories = await Promise.all(
            results.map(async (t) => {
                const category = await ctx.db.get(t.categoryId);
                return { ...t, category };
            })
        );

        return withCategories;
    },
});

// Ambil satu transaksi - lengkap sama kategorinya
export const get = query({
    args: { id: v.id("transactions") },
    handler: async (ctx, args) => {
        const transaction = await ctx.db.get(args.id);
        if (!transaction) return null;

        const category = await ctx.db.get(transaction.categoryId);
        return { ...transaction, category };
    },
});

// Bikin transaksi baru - dipake pas catat pemasukan atau pengeluaran
export const create = mutation({
    args: {
        kandangId: v.id("kandang"),
        categoryId: v.id("categories"),
        categoryName: v.string(), // Nama kategori dari modal
        createdBy: v.id("users"),
        amount: v.number(),
        type: v.union(v.literal("income"), v.literal("expense")),
        description: v.string(),
        date: v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("transactions", {
            ...args,
            createdAt: Date.now(),
        });
    },
});

// Update transaksi - bisa ganti kategori, jumlah, tipe, dll
export const update = mutation({
    args: {
        id: v.id("transactions"),
        categoryId: v.optional(v.id("categories")),
        categoryName: v.optional(v.string()), // Nama kategori kalo diganti
        amount: v.optional(v.number()),
        type: v.optional(v.union(v.literal("income"), v.literal("expense"))),
        description: v.optional(v.string()),
        date: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, {
            ...updates,
            updatedAt: Date.now(),
        });
    },
});

// Hapus transaksi - kalo salah input ya hapus aja
export const remove = mutation({
    args: { id: v.id("transactions") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

// Ambil ringkasan dashboard buat satu kandang
// Total masuk, total keluar, saldo, breakdown per kategori, sama transaksi terakhir
export const getDashboard = query({
    args: { kandangId: v.id("kandang") },
    handler: async (ctx, args) => {
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_kandang", (q) => q.eq("kandangId", args.kandangId))
            .collect();

        // Hitung total pemasukan
        const totalIncome = transactions
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + t.amount, 0);

        // Hitung total pengeluaran
        const totalExpense = transactions
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);

        // Saldo = masuk - keluar
        const balance = totalIncome - totalExpense;

        // Breakdown pengeluaran per kategori - buat chart pie
        const expenseByCategory: Record<string, number> = {};
        for (const t of transactions.filter((t) => t.type === "expense")) {
            const cat = await ctx.db.get(t.categoryId);
            if (cat) {
                expenseByCategory[cat.name] = (expenseByCategory[cat.name] || 0) + t.amount;
            }
        }

        // Ambil 5 transaksi terakhir - buat ditampilin di dashboard
        const recent = transactions
            .sort((a, b) => b.date - a.date)
            .slice(0, 5);

        const recentWithCategory = await Promise.all(
            recent.map(async (t) => {
                const category = await ctx.db.get(t.categoryId);
                return { ...t, category };
            })
        );

        return {
            totalIncome,
            totalExpense,
            balance,
            transactionCount: transactions.length,
            expenseByCategory,
            recentTransactions: recentWithCategory,
        };
    },
});

// Import transaksi banyak sekaligus - dipake pas import dari Excel
// Mantap buat migrasi data awal!
export const batchCreate = mutation({
    args: {
        transactions: v.array(
            v.object({
                kandangId: v.id("kandang"),
                categoryId: v.id("categories"),
                categoryName: v.string(), // Nama kategori
                createdBy: v.id("users"),
                amount: v.number(),
                type: v.union(v.literal("income"), v.literal("expense")),
                description: v.string(),
                date: v.number(),
            })
        ),
    },
    handler: async (ctx, args) => {
        const ids = [];
        for (const tx of args.transactions) {
            const id = await ctx.db.insert("transactions", {
                ...tx,
                createdAt: Date.now(),
            });
            ids.push(id);
        }
        return { count: ids.length, ids };
    },
});
