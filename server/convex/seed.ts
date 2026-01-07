import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Seed semua data sekaligus: user, market, kategori, kandang, sama transaksi
// Sistem baru: Market -> Kandang -> Transaksi
export const seedAll = mutation({
    args: {},
    handler: async (ctx) => {
        // 1. Bikin test user
        // Password: test123456 (sudah di-hash dengan bcrypt - 10 rounds)
        const testPasswordHash = "$2b$10$4ev9RBhkTf5X.ihuFKMB0ejAHoy06lhgpLZ8n.lFSlSuM7vfYCGW.";

        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", "test123@gmail.com"))
            .first();

        let userId;
        if (existingUser) {
            userId = existingUser._id;
        } else {
            userId = await ctx.db.insert("users", {
                email: "test123@gmail.com",
                username: "test123",
                name: "test",
                passwordHash: testPasswordHash,
                createdAt: Date.now(),
            });
        }

        // 2. Bikin Market - Kampoeng Endok
        const existingMarket = await ctx.db
            .query("markets")
            .withIndex("by_owner", (q) => q.eq("ownerId", userId))
            .first();

        let marketId;
        if (existingMarket) {
            marketId = existingMarket._id;
        } else {
            marketId = await ctx.db.insert("markets", {
                name: "Kampoeng Endok",
                handle: "kampoengendok",
                description: "Peternakan ayam petelur terbaik di kampung kita!",
                ownerId: userId,
                isActive: true,
                createdAt: Date.now(),
            });
        }

        // 3. Seed kategori - kalo belum ada, masukin default
        const existingCat = await ctx.db.query("categories").first();
        const categoryMap: Record<string, any> = {};

        if (!existingCat) {
            const defaultCategories = [
                // Kategori pengeluaran - bikin duit keluar 💸
                { name: "Pakan", icon: "🌾", color: "#F59E0B", type: "expense" as const },
                { name: "Obat & Vaksin", icon: "💊", color: "#EF4444", type: "expense" as const },
                { name: "Gas Elpiji", icon: "🔥", color: "#F97316", type: "expense" as const },
                { name: "Gaji Karyawan", icon: "👷", color: "#8B5CF6", type: "expense" as const },
                { name: "Listrik", icon: "⚡", color: "#3B82F6", type: "expense" as const },
                { name: "Transportasi", icon: "🚗", color: "#6366F1", type: "expense" as const },
                { name: "Peralatan", icon: "🔧", color: "#64748B", type: "expense" as const },
                { name: "Admin Bank", icon: "🏦", color: "#78716C", type: "expense" as const },
                { name: "Pullet/DOC", icon: "🐣", color: "#FBBF24", type: "expense" as const },
                { name: "Pembangunan", icon: "🏗️", color: "#0EA5E9", type: "expense" as const },
                { name: "Lain-lain", icon: "📦", color: "#94A3B8", type: "expense" as const },
                // Kategori pemasukan - cuan masuk! 💰
                { name: "Investasi", icon: "💰", color: "#22C55E", type: "income" as const },
                { name: "Penjualan Telur", icon: "🥚", color: "#10B981", type: "income" as const },
                { name: "Penjualan Ayam", icon: "🐔", color: "#059669", type: "income" as const },
                { name: "Bunga Bank", icon: "📈", color: "#14B8A6", type: "income" as const },
                { name: "Lainnya", icon: "💵", color: "#34D399", type: "income" as const },
            ];

            for (const cat of defaultCategories) {
                const id = await ctx.db.insert("categories", cat);
                categoryMap[cat.name] = id;
            }
        } else {
            // Load kategori yang udah ada
            const allCats = await ctx.db.query("categories").collect();
            for (const cat of allCats) {
                categoryMap[cat.name] = cat._id;
            }
        }

        // 4. Bikin kandang - tempat ayam-ayam kita tinggal 🐔
        // Semua kandang sekarang terikat ke market!
        const kandangNames = ["AYAM PERTAMA", "AYAM KEDUA", "Kandang KEVIN"];
        const kandangMap: Record<string, any> = {};

        for (const name of kandangNames) {
            const existing = await ctx.db
                .query("kandang")
                .filter((q) => q.eq(q.field("name"), name))
                .first();

            if (existing) {
                // Ensure marketId is correct (fix orphan data)
                if (existing.marketId !== marketId) {
                    await ctx.db.patch(existing._id, { marketId });
                }
                kandangMap[name] = existing._id;
            } else {
                const id = await ctx.db.insert("kandang", {
                    name,
                    marketId, // Sekarang pake marketId, bukan headOwnerId
                    description: `Kandang ${name}`,
                    isActive: true,
                    createdAt: Date.now(),
                });
                kandangMap[name] = id;
            }
        }

        // 5. Import transaksi dari data Excel - ini nih data benerannya!
        const importedTransactions = [
            // AYAM PERTAMA - baru dikit transaksinya
            { kandang: "AYAM PERTAMA", description: "Biaya transfer", amount: 2500, type: "expense", category: "Admin Bank", date: new Date(2025, 6, 19).getTime() },
            { kandang: "AYAM PERTAMA", description: "Biaya transfer", amount: 2500, type: "expense", category: "Admin Bank", date: new Date(2025, 6, 22).getTime() },
            { kandang: "AYAM PERTAMA", description: "Biaya administrasi rekening Bank", amount: 12500, type: "expense", category: "Admin Bank", date: new Date(2025, 6, 31).getTime() },
            // AYAM KEDUA - udah rame transaksinya nih
            { kandang: "AYAM KEDUA", description: "DP pembayaran pullet KEDUA Kevin Farm", amount: 150000000, type: "income", category: "Investasi", date: new Date(2025, 8, 11).getTime() },
            { kandang: "AYAM KEDUA", description: "Pembayaran pullet KEDUA sebanyak 4.500 ekor @12.656", amount: 56952000, type: "expense", category: "Pullet/DOC", date: new Date(2025, 8, 11).getTime() },
            { kandang: "AYAM KEDUA", description: "Biaya admin", amount: 6500, type: "expense", category: "Admin Bank", date: new Date(2025, 8, 11).getTime() },
            { kandang: "AYAM KEDUA", description: "Pembelian 68 gas elpiji @24.000", amount: 1632000, type: "expense", category: "Gas Elpiji", date: new Date(2025, 8, 11).getTime() },
            { kandang: "AYAM KEDUA", description: "Gula & Jahe", amount: 50000, type: "expense", category: "Lain-lain", date: new Date(2025, 8, 11).getTime() },
            { kandang: "AYAM KEDUA", description: "Pembelian kertas koran sebanyak 20 kg", amount: 184500, type: "expense", category: "Lain-lain", date: new Date(2025, 8, 11).getTime() },
            { kandang: "AYAM KEDUA", description: "Bongkar @100.000", amount: 500000, type: "expense", category: "Transportasi", date: new Date(2025, 8, 11).getTime() },
            { kandang: "AYAM KEDUA", description: "Pembelian pakan 2 ton @7.300", amount: 14600000, type: "expense", category: "Pakan", date: new Date(2025, 8, 11).getTime() },
            { kandang: "AYAM KEDUA", description: "Biaya admin", amount: 6500, type: "expense", category: "Admin Bank", date: new Date(2025, 8, 11).getTime() },
            { kandang: "AYAM KEDUA", description: "Mobil angkutan", amount: 500000, type: "expense", category: "Transportasi", date: new Date(2025, 8, 11).getTime() },
            { kandang: "AYAM KEDUA", description: "Bongkar @100.000", amount: 100000, type: "expense", category: "Transportasi", date: new Date(2025, 8, 11).getTime() },
            { kandang: "AYAM KEDUA", description: "Pembelian obat untuk pembesaran oemah putra D&R", amount: 13970000, type: "expense", category: "Obat & Vaksin", date: new Date(2025, 8, 11).getTime() },
            { kandang: "AYAM KEDUA", description: "Pembelian 30 buah lampu bohlam LED 15 watt kuning", amount: 771918, type: "expense", category: "Peralatan", date: new Date(2025, 8, 11).getTime() },
            { kandang: "AYAM KEDUA", description: "Pembelian 2 buah timbangan", amount: 777963, type: "expense", category: "Peralatan", date: new Date(2025, 8, 14).getTime() },
            { kandang: "AYAM KEDUA", description: "Upah vaksin 3 orang @100.000 tetes mata NDIB", amount: 300000, type: "expense", category: "Obat & Vaksin", date: new Date(2025, 8, 15).getTime() },
            { kandang: "AYAM KEDUA", description: "Biaya administrasi kartu debit", amount: 10000, type: "expense", category: "Admin Bank", date: new Date(2025, 8, 17).getTime() },
            { kandang: "AYAM KEDUA", description: "Upah vaksin GUMBORO 3 orang @100.000", amount: 300000, type: "expense", category: "Obat & Vaksin", date: new Date(2025, 8, 19).getTime() },
            { kandang: "AYAM KEDUA", description: "Bayar Listrik", amount: 503500, type: "expense", category: "Listrik", date: new Date(2025, 8, 20).getTime() },
            { kandang: "AYAM KEDUA", description: "Upah vaksin KILL suntik leher 4 orang", amount: 800000, type: "expense", category: "Obat & Vaksin", date: new Date(2025, 8, 21).getTime() },
            { kandang: "AYAM KEDUA", description: "Pembelian 108 gas elpiji @24.000 (sudah dibeli 64, sisa 44)", amount: 1056000, type: "expense", category: "Gas Elpiji", date: new Date(2025, 8, 22).getTime() },
            { kandang: "AYAM KEDUA", description: "Gaji Rudi", amount: 2500000, type: "expense", category: "Gaji Karyawan", date: new Date(2025, 8, 24).getTime() },
            { kandang: "AYAM KEDUA", description: "Uang makan 1 orang", amount: 500000, type: "expense", category: "Gaji Karyawan", date: new Date(2025, 8, 24).getTime() },
            { kandang: "AYAM KEDUA", description: "Biaya admin", amount: 2500, type: "expense", category: "Admin Bank", date: new Date(2025, 8, 25).getTime() },
            { kandang: "AYAM KEDUA", description: "Pembelian 1 unit motor Jupiter 2011", amount: 3000000, type: "expense", category: "Peralatan", date: new Date(2025, 8, 25).getTime() },
            { kandang: "AYAM KEDUA", description: "Service motor", amount: 1135000, type: "expense", category: "Peralatan", date: new Date(2025, 8, 25).getTime() },
            { kandang: "AYAM KEDUA", description: "Biaya admin", amount: 2500, type: "expense", category: "Admin Bank", date: new Date(2025, 8, 25).getTime() },
            { kandang: "AYAM KEDUA", description: "Upah vaksin GUMBORO 4 orang", amount: 400000, type: "expense", category: "Obat & Vaksin", date: new Date(2025, 8, 26).getTime() },
            { kandang: "AYAM KEDUA", description: "Biaya administrasi rekening", amount: 12500, type: "expense", category: "Admin Bank", date: new Date(2025, 8, 30).getTime() },
            { kandang: "AYAM KEDUA", description: "Pajak rekening", amount: 1750, type: "expense", category: "Admin Bank", date: new Date(2025, 8, 30).getTime() },
            { kandang: "AYAM KEDUA", description: "Bunga rekening", amount: 8750, type: "income", category: "Bunga Bank", date: new Date(2025, 8, 30).getTime() },
        ];

        // Cek udah di-import belum - biar ga dobel
        const existingTx = await ctx.db.query("transactions").first();
        let txCount = 0;

        if (!existingTx) {
            for (const tx of importedTransactions) {
                const kandangId = kandangMap[tx.kandang];
                const categoryId = categoryMap[tx.category] || categoryMap["Lain-lain"];

                if (kandangId && categoryId) {
                    await ctx.db.insert("transactions", {
                        kandangId,
                        categoryId,
                        categoryName: tx.category, // Simpan nama kategori langsung
                        createdBy: userId,
                        amount: tx.amount,
                        type: tx.type as "income" | "expense",
                        description: tx.description,
                        date: tx.date,
                        createdAt: Date.now(),
                    });
                    txCount++;

                    // Kalo ini investasi, masukin ke tabel investors juga
                    if (tx.category === "Investasi" && tx.type === "income") {
                        // Cek existing investor record
                        const existingInv = await ctx.db
                            .query("kandangInvestors")
                            .withIndex("by_kandang_user", (q) =>
                                q.eq("kandangId", kandangId).eq("userId", userId)
                            )
                            .first();

                        if (existingInv) {
                            await ctx.db.patch(existingInv._id, {
                                investmentAmount: existingInv.investmentAmount + tx.amount,
                            });
                        } else {
                            await ctx.db.insert("kandangInvestors", {
                                kandangId,
                                userId,
                                investmentAmount: tx.amount,
                                investedAt: tx.date,
                            });
                        }
                    }
                }
            }
        }

        return {
            success: true,
            user: { id: userId, name: "test", email: "test123@gmail.com", username: "test123" },
            market: { id: marketId, name: "Kampoeng Endok" },
            categoriesCount: Object.keys(categoryMap).length,
            kandangCount: Object.keys(kandangMap).length,
            transactionsImported: txCount,
            kandangIds: kandangMap,
        };
    },
});

// Cek status seed - buat tau udah di-seed atau belum
export const getSeedStatus = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const markets = await ctx.db.query("markets").collect();
        const categories = await ctx.db.query("categories").collect();
        const kandang = await ctx.db.query("kandang").collect();
        const transactions = await ctx.db.query("transactions").collect();

        return {
            usersCount: users.length,
            marketsCount: markets.length,
            categoriesCount: categories.length,
            kandangCount: kandang.length,
            transactionsCount: transactions.length,
            users: users.map((u) => ({ _id: u._id, name: u.name, email: u.email })),
            markets: markets.map((m) => ({ _id: m._id, name: m.name, ownerId: m.ownerId })),
            kandangList: kandang.map((k) => ({ _id: k._id, name: k.name, marketId: k.marketId })),
        };
    },
});

// Clear semua data - buat fresh reset!
// ⚠️ HATI-HATI: Ini bakal hapus SEMUA data!
export const clearAll = mutation({
    args: {},
    handler: async (ctx) => {
        // Hapus transactions dulu
        const transactions = await ctx.db.query("transactions").collect();
        for (const tx of transactions) {
            await ctx.db.delete(tx._id);
        }

        // Hapus kandang investors
        const investors = await ctx.db.query("kandangInvestors").collect();
        for (const inv of investors) {
            await ctx.db.delete(inv._id);
        }

        // Hapus kandang
        const kandang = await ctx.db.query("kandang").collect();
        for (const k of kandang) {
            await ctx.db.delete(k._id);
        }

        // Hapus market members
        const marketMembers = await ctx.db.query("marketMembers").collect();
        for (const m of marketMembers) {
            await ctx.db.delete(m._id);
        }

        // Hapus markets
        const markets = await ctx.db.query("markets").collect();
        for (const m of markets) {
            await ctx.db.delete(m._id);
        }

        // Hapus categories
        const categories = await ctx.db.query("categories").collect();
        for (const c of categories) {
            await ctx.db.delete(c._id);
        }

        // Hapus users terakhir
        const users = await ctx.db.query("users").collect();
        for (const u of users) {
            await ctx.db.delete(u._id);
        }

        return {
            success: true,
            deleted: {
                transactions: transactions.length,
                investors: investors.length,
                kandang: kandang.length,
                marketMembers: marketMembers.length,
                markets: markets.length,
                categories: categories.length,
                users: users.length
            }
        };
    },
});

// Seed dari JSON external - terima transaksi dari luar
export const seedFromJson = mutation({
    args: {
        transactions: v.array(v.object({
            kandang: v.string(),
            description: v.string(),
            amount: v.number(),
            type: v.string(),
            category: v.string(),
            date: v.number(),
        })),
    },
    handler: async (ctx, args) => {
        // 1. Bikin test user
        const testPasswordHash = "$2b$10$4ev9RBhkTf5X.ihuFKMB0ejAHoy06lhgpLZ8n.lFSlSuM7vfYCGW.";

        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", "test123@gmail.com"))
            .first();

        let userId;
        if (existingUser) {
            userId = existingUser._id;
        } else {
            userId = await ctx.db.insert("users", {
                email: "test123@gmail.com",
                username: "test123",
                name: "test",
                passwordHash: testPasswordHash,
                createdAt: Date.now(),
            });
        }

        // 2. Bikin Market - Kampoeng Endok
        const existingMarket = await ctx.db
            .query("markets")
            .withIndex("by_owner", (q) => q.eq("ownerId", userId))
            .first();

        let marketId;
        if (existingMarket) {
            marketId = existingMarket._id;
        } else {
            marketId = await ctx.db.insert("markets", {
                name: "Kampoeng Endok",
                handle: "kampoengendok",
                description: "Peternakan ayam petelur terbaik di kampung kita!",
                ownerId: userId,
                isActive: true,
                createdAt: Date.now(),
            });
        }

        // 3. Seed kategori
        const existingCat = await ctx.db.query("categories").first();
        const categoryMap: Record<string, any> = {};

        if (!existingCat) {
            const defaultCategories = [
                { name: "Pakan", icon: "🌾", color: "#F59E0B", type: "expense" as const },
                { name: "Obat & Vaksin", icon: "💊", color: "#EF4444", type: "expense" as const },
                { name: "Gas Elpiji", icon: "🔥", color: "#F97316", type: "expense" as const },
                { name: "Gaji Karyawan", icon: "👷", color: "#8B5CF6", type: "expense" as const },
                { name: "Listrik", icon: "⚡", color: "#3B82F6", type: "expense" as const },
                { name: "Transportasi", icon: "🚗", color: "#6366F1", type: "expense" as const },
                { name: "Peralatan", icon: "🔧", color: "#64748B", type: "expense" as const },
                { name: "Admin Bank", icon: "🏦", color: "#78716C", type: "expense" as const },
                { name: "Pullet/DOC", icon: "🐣", color: "#FBBF24", type: "expense" as const },
                { name: "Pembangunan", icon: "🏗️", color: "#0EA5E9", type: "expense" as const },
                { name: "Lain-lain", icon: "📦", color: "#94A3B8", type: "expense" as const },
                { name: "Investasi", icon: "💰", color: "#22C55E", type: "income" as const },
                { name: "Penjualan Telur", icon: "🥚", color: "#10B981", type: "income" as const },
                { name: "Penjualan Ayam", icon: "🐔", color: "#059669", type: "income" as const },
                { name: "Bunga Bank", icon: "📈", color: "#14B8A6", type: "income" as const },
                { name: "Lainnya", icon: "💵", color: "#34D399", type: "income" as const },
            ];

            for (const cat of defaultCategories) {
                const id = await ctx.db.insert("categories", cat);
                categoryMap[cat.name] = id;
            }
        } else {
            const allCats = await ctx.db.query("categories").collect();
            for (const cat of allCats) {
                categoryMap[cat.name] = cat._id;
            }
        }

        // 4. Bikin kandang dari transaksi yang ada
        const kandangNames = [...new Set(args.transactions.map(tx => tx.kandang))];
        const kandangMap: Record<string, any> = {};

        for (const name of kandangNames) {
            const existing = await ctx.db
                .query("kandang")
                .filter((q) => q.eq(q.field("name"), name))
                .first();

            if (existing) {
                if (existing.marketId !== marketId) {
                    await ctx.db.patch(existing._id, { marketId });
                }
                kandangMap[name] = existing._id;
            } else {
                const id = await ctx.db.insert("kandang", {
                    name,
                    marketId,
                    description: `Kandang ${name}`,
                    isActive: true,
                    createdAt: Date.now(),
                });
                kandangMap[name] = id;
            }
        }

        // 5. Import transaksi dari JSON
        let txCount = 0;

        for (const tx of args.transactions) {
            const kandangId = kandangMap[tx.kandang];
            // Cari kategori yang sesuai (cek nama dan type)
            let categoryId = categoryMap[tx.category];

            // Fallback ke Lain-lain jika kategori tidak ditemukan
            if (!categoryId) {
                categoryId = categoryMap["Lain-lain"] || categoryMap["Lainnya"];
            }

            if (kandangId && categoryId) {
                await ctx.db.insert("transactions", {
                    kandangId,
                    categoryId,
                    categoryName: tx.category,
                    createdBy: userId,
                    amount: tx.amount,
                    type: tx.type as "income" | "expense",
                    description: tx.description,
                    date: tx.date,
                    createdAt: Date.now(),
                });
                txCount++;

                // Kalo ini investasi, masukin ke tabel investors juga
                if (tx.category === "Investasi" && tx.type === "income") {
                    const existingInv = await ctx.db
                        .query("kandangInvestors")
                        .withIndex("by_kandang_user", (q) =>
                            q.eq("kandangId", kandangId).eq("userId", userId)
                        )
                        .first();

                    if (existingInv) {
                        await ctx.db.patch(existingInv._id, {
                            investmentAmount: existingInv.investmentAmount + tx.amount,
                        });
                    } else {
                        await ctx.db.insert("kandangInvestors", {
                            kandangId,
                            userId,
                            investmentAmount: tx.amount,
                            investedAt: tx.date,
                        });
                    }
                }
            }
        }

        return {
            success: true,
            user: { id: userId, name: "test", email: "test123@gmail.com", username: "test123" },
            market: { id: marketId, name: "Kampoeng Endok" },
            categoriesCount: Object.keys(categoryMap).length,
            kandangCount: Object.keys(kandangMap).length,
            transactionsImported: txCount,
            kandangIds: kandangMap,
        };
    },
});
