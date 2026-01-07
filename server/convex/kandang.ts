import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Ambil semua kandang dalam market tertentu (dengan ROI)
export const listByMarket = query({
    args: { marketId: v.id("markets") },
    handler: async (ctx, args) => {
        const kandangList = await ctx.db
            .query("kandang")
            .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
            .collect();

        // Hitung ROI untuk setiap kandang
        const kandangWithROI = await Promise.all(
            kandangList.map(async (kandang) => {
                // Ambil transaksi
                const transactions = await ctx.db
                    .query("transactions")
                    .withIndex("by_kandang", (q) => q.eq("kandangId", kandang._id))
                    .collect();

                // Hitung profit dari SEMUA income dan expense
                let totalIncome = 0;
                let totalExpense = 0;
                for (const tx of transactions) {
                    if (tx.type === "income") totalIncome += tx.amount;
                    else totalExpense += tx.amount;
                }
                const profit = totalIncome - totalExpense;


                // Ambil investasi dari tabel kandangInvestors
                const investors = await ctx.db
                    .query("kandangInvestors")
                    .withIndex("by_kandang", (q) => q.eq("kandangId", kandang._id))
                    .collect();
                const totalInvestment = investors.reduce((sum, inv) => sum + inv.investmentAmount, 0);

                const roi = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0;

                return {
                    ...kandang,
                    roi: Math.round(roi * 10) / 10,
                    totalInvestment,
                    profit,
                };
            })
        );

        return kandangWithROI;
    },
});


// Ambil satu kandang by ID
export const get = query({
    args: { id: v.id("kandang") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

// Ambil kandang lengkap sama market-nya
export const getWithMarket = query({
    args: { id: v.id("kandang") },
    handler: async (ctx, args) => {
        const kandang = await ctx.db.get(args.id);
        if (!kandang) return null;

        const market = await ctx.db.get(kandang.marketId);

        // Hitung total investor di kandang ini
        const investors = await ctx.db
            .query("kandangInvestors")
            .withIndex("by_kandang", (q) => q.eq("kandangId", args.id))
            .collect();

        return {
            ...kandang,
            market,
            investorCount: investors.length,
            totalInvestment: investors.reduce((sum, inv) => sum + inv.investmentAmount, 0),
        };
    },
});

// Query: Ambil statistik kandang (ROI, profit, prediksi)
export const getKandangStats = query({
    args: { kandangId: v.id("kandang") },
    handler: async (ctx, args) => {
        const kandang = await ctx.db.get(args.kandangId);
        if (!kandang) return null;

        // Ambil semua transaksi kandang ini
        const transactions = await ctx.db
            .query("transactions")
            .withIndex("by_kandang", (q) => q.eq("kandangId", args.kandangId))
            .collect();

        // Hitung total income & expense (SEMUA transaksi)
        let totalIncome = 0;
        let totalExpense = 0;

        for (const tx of transactions) {
            if (tx.type === "income") {
                totalIncome += tx.amount;
            } else {
                totalExpense += tx.amount;
            }
        }

        const profit = totalIncome - totalExpense;

        // Ambil total investasi dari tabel kandangInvestors
        const investors = await ctx.db
            .query("kandangInvestors")
            .withIndex("by_kandang", (q) => q.eq("kandangId", args.kandangId))
            .collect();

        const totalInvestment = investors.reduce((sum, inv) => sum + inv.investmentAmount, 0);

        // Hitung ROI
        // ROI = (Profit / Total Investment) * 100
        const roi = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0;

        // Hitung profit per bulan untuk prediksi (3 bulan terakhir)
        const now = Date.now();
        const threeMonthsAgo = now - (90 * 24 * 60 * 60 * 1000);

        const recentTransactions = transactions.filter(tx => tx.date >= threeMonthsAgo);

        // Group by month
        const monthlyProfits: Record<string, number> = {};
        for (const tx of recentTransactions) {
            const monthKey = new Date(tx.date).toISOString().slice(0, 7); // "YYYY-MM"
            if (!monthlyProfits[monthKey]) monthlyProfits[monthKey] = 0;
            monthlyProfits[monthKey] += tx.type === "income" ? tx.amount : -tx.amount;
        }

        const monthlyValues = Object.values(monthlyProfits);
        const avgMonthlyProfit = monthlyValues.length > 0
            ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length
            : 0;

        // Prediksi ROI bulanan
        const predictedMonthlyROI = totalInvestment > 0
            ? (avgMonthlyProfit / totalInvestment) * 100
            : 0;

        // Break-even estimation (bulan)
        const monthsToBreakEven = avgMonthlyProfit > 0
            ? Math.ceil(totalInvestment / avgMonthlyProfit)
            : null;

        return {
            kandangId: args.kandangId,
            totalIncome,
            totalExpense,
            profit,
            totalInvestment,
            investorCount: investors.length,
            roi: Math.round(roi * 10) / 10, // 1 decimal
            avgMonthlyProfit: Math.round(avgMonthlyProfit),
            predictedMonthlyROI: Math.round(predictedMonthlyROI * 10) / 10,
            monthsToBreakEven,
            transactionCount: transactions.length,
        };
    },
});


// Bikin kandang baru - harus dalam context market
export const create = mutation({
    args: {
        name: v.string(),
        marketId: v.id("markets"),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Cek market ada & aktif
        const market = await ctx.db.get(args.marketId);
        if (!market || !market.isActive) {
            throw new Error("Market tidak ditemukan atau tidak aktif");
        }

        return await ctx.db.insert("kandang", {
            name: args.name,
            marketId: args.marketId,
            description: args.description,
            isActive: true,
            createdAt: Date.now(),
        });
    },
});

// Update info kandang
export const update = mutation({
    args: {
        id: v.id("kandang"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        avatar: v.optional(v.string()),
        avatarStorageId: v.optional(v.id("_storage")),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { id, avatarStorageId, ...updates } = args;

        // Filter out undefined values
        const filteredUpdates: Record<string, any> = {};
        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                filteredUpdates[key] = value;
            }
        }

        // If avatarStorageId is provided, generate URL
        if (avatarStorageId) {
            const url = await ctx.storage.getUrl(avatarStorageId);
            if (url) {
                filteredUpdates.avatar = url;
            }
        }

        await ctx.db.patch(id, filteredUpdates);
    },
});

// Hapus kandang 
export const remove = mutation({
    args: { id: v.id("kandang") },
    handler: async (ctx, args) => {
        // Hapus semua investor yang terkait
        const investors = await ctx.db
            .query("kandangInvestors")
            .withIndex("by_kandang", (q) => q.eq("kandangId", args.id))
            .collect();

        for (const inv of investors) {
            await ctx.db.delete(inv._id);
        }

        await ctx.db.delete(args.id);
    },
});

// ============ INVESTOR FUNCTIONS ============

// Ambil semua investor di kandang
export const getInvestors = query({
    args: { kandangId: v.id("kandang") },
    handler: async (ctx, args) => {
        const investors = await ctx.db
            .query("kandangInvestors")
            .withIndex("by_kandang", (q) => q.eq("kandangId", args.kandangId))
            .collect();

        // Ambil detail user buat tiap investor
        const result = await Promise.all(
            investors.map(async (inv) => {
                const user = await ctx.db.get(inv.userId);
                return {
                    ...inv,
                    user: user ? {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        avatar: user.avatar,
                    } : null,
                };
            })
        );

        return result;
    },
});

// Tambah investor ke kandang
export const addInvestor = mutation({
    args: {
        kandangId: v.id("kandang"),
        userId: v.id("users"),
        investmentAmount: v.number(),
    },
    handler: async (ctx, args) => {
        // Cek dulu udah invest belum
        const existing = await ctx.db
            .query("kandangInvestors")
            .withIndex("by_kandang_user", (q) =>
                q.eq("kandangId", args.kandangId).eq("userId", args.userId)
            )
            .first();

        if (existing) {
            // Update jumlah investasi kalo udah pernah invest
            await ctx.db.patch(existing._id, {
                investmentAmount: existing.investmentAmount + args.investmentAmount,
                investedAt: Date.now(),
            });
        } else {
            await ctx.db.insert("kandangInvestors", {
                kandangId: args.kandangId,
                userId: args.userId,
                investmentAmount: args.investmentAmount,
                investedAt: Date.now(),
            });
        }

        // CATAT TRANSAKSI INVESTASI
        // Cari kategori "Investasi"
        const investCategory = await ctx.db
            .query("categories")
            .filter((q) => q.eq(q.field("name"), "Investasi"))
            .first();

        if (investCategory) {
            await ctx.db.insert("transactions", {
                kandangId: args.kandangId,
                categoryId: investCategory._id,
                categoryName: "Investasi",
                createdBy: args.userId,
                amount: args.investmentAmount,
                type: "income",
                description: "Investasi Modal",
                date: Date.now(),
                createdAt: Date.now(),
            });
        }

    },
});

export const getUserInvestments = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const investments = await ctx.db
            .query("kandangInvestors")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const results = await Promise.all(
            investments.map(async (inv) => {
                const kandang = await ctx.db.get(inv.kandangId);
                let market = null;
                if (kandang) {
                    market = await ctx.db.get(kandang.marketId);
                }
                return {
                    ...inv,
                    kandang,
                    market,
                };
            })
        );

        return results;
    },
});

// Remove investor dari kandang
export const removeInvestor = mutation({
    args: {
        kandangId: v.id("kandang"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const investor = await ctx.db
            .query("kandangInvestors")
            .withIndex("by_kandang_user", (q) =>
                q.eq("kandangId", args.kandangId).eq("userId", args.userId)
            )
            .first();

        if (investor) {
            await ctx.db.delete(investor._id);
        }
    },
});

// Cek role user di market tertentu
// Returns: head_owner (jika ownerId), co_owner (jika di marketMembers), investor (jika invest di kandang), atau null
export const getUserRoleInMarket = query({
    args: {
        marketId: v.id("markets"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const market = await ctx.db.get(args.marketId);
        if (!market) return null;

        // Head owner?
        if (market.ownerId === args.userId) {
            return "head_owner";
        }

        // Co-owner di market?
        const membership = await ctx.db
            .query("marketMembers")
            .withIndex("by_market_user", (q) =>
                q.eq("marketId", args.marketId).eq("userId", args.userId)
            )
            .first();

        if (membership) {
            return membership.role;
        }

        // Investor di salah satu kandang dalam market?
        const kandangList = await ctx.db
            .query("kandang")
            .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
            .collect();

        for (const k of kandangList) {
            const investment = await ctx.db
                .query("kandangInvestors")
                .withIndex("by_kandang_user", (q) =>
                    q.eq("kandangId", k._id).eq("userId", args.userId)
                )
                .first();

            if (investment) {
                return "investor";
            }
        }

        return null;
    },
});
