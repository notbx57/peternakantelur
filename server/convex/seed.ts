import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Seed semua data sekaligus: user, kategori, kandang, sama transaksi
// Mantap banget buat setup awal, tinggal panggil sekali aja!
export const seedAll = mutation({
    args: {},
    handler: async (ctx) => {
        // 1. Bikin dummy head owner - bos besar kandang
        // Password: Admin123! (sudah di-hash dengan bcrypt)
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", "admin@kampoengendok.com"))
            .first();

        let userId;
        if (existingUser) {
            userId = existingUser._id;
        } else {
            // Password "Admin123!" di-hash pake bcrypt (10 rounds)
            const passwordHash = "$2b$10$Srf6VcgVzte8S1VFsW23rei1aLvTqJeR7DJ6c9AX5mPB4isNs6Pd2";

            userId = await ctx.db.insert("users", {
                email: "admin@kampoengendok.com",
                username: "admin",
                name: "Admin Kampoeng Endok",
                passwordHash: passwordHash,
                role: "head_owner",
                createdAt: Date.now(),
            });
        }

        // 2. Seed kategori - kalo belum ada, masukin default
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

        // 3. Bikin kandang - tempat ayam-ayam kita tinggal 🐔
        const kandangNames = ["AYAM PERTAMA", "AYAM KEDUA", "Kandang KEVIN"];
        const kandangMap: Record<string, any> = {};

        for (const name of kandangNames) {
            const existing = await ctx.db
                .query("kandang")
                .filter((q) => q.eq(q.field("name"), name))
                .first();

            if (existing) {
                kandangMap[name] = existing._id;
            } else {
                const id = await ctx.db.insert("kandang", {
                    name,
                    headOwnerId: userId,
                    description: `Kandang ${name}`,
                    isActive: true,
                    createdAt: Date.now(),
                });
                kandangMap[name] = id;
            }
        }

        // 3.5 Seed random users buat testing Anggota Kandang 👥
        // Password: User123! (sama buat semua user biar gampang testing)
        const testPasswordHash = "$2b$10$Srf6VcgVzte8S1VFsW23rei1aLvTqJeR7DJ6c9AX5mPB4isNs6Pd2";
        const randomUsers = [
            { name: "Rudi Hartono", username: "rudi", email: "rudi@example.com" },
            { name: "Kevin Wijaya", username: "kevin", email: "kevin@example.com" },
            { name: "Budi Santoso", username: "budi", email: "budi@example.com" },
            { name: "Dewi Lestari", username: "dewi", email: "dewi@example.com" },
            { name: "Andi Pratama", username: "andi", email: "andi@example.com" },
        ];

        const createdUserIds: any[] = [];
        for (const userData of randomUsers) {
            const existing = await ctx.db
                .query("users")
                .withIndex("by_email", (q) => q.eq("email", userData.email))
                .first();

            if (!existing) {
                const newUserId = await ctx.db.insert("users", {
                    ...userData,
                    passwordHash: testPasswordHash,
                    role: "user", // Default role user, harus request jadi investor
                    createdAt: Date.now(),
                });
                createdUserIds.push(newUserId);
            } else {
                createdUserIds.push(existing._id);
            }
        }

        // Tambahkan user-user ini sebagai member di kandang pertama
        // User pertama jadi co_owner, sisanya jadi investor
        const firstKandangId = kandangMap["AYAM PERTAMA"];
        if (firstKandangId && createdUserIds.length > 0) {
            for (let i = 0; i < createdUserIds.length; i++) {
                const existingMember = await ctx.db
                    .query("kandangMembers")
                    .withIndex("by_kandang_user", (q) =>
                        q.eq("kandangId", firstKandangId).eq("userId", createdUserIds[i])
                    )
                    .first();

                if (!existingMember) {
                    await ctx.db.insert("kandangMembers", {
                        kandangId: firstKandangId,
                        userId: createdUserIds[i],
                        role: i === 0 ? "co_owner" : "investor", // Rudi jadi co_owner
                        addedAt: Date.now(),
                    });
                }
            }
        }

        // 4. Import transaksi dari data Excel - ini nih data benerannya!
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
                        createdBy: userId,
                        amount: tx.amount,
                        type: tx.type as "income" | "expense",
                        description: tx.description,
                        date: tx.date,
                        createdAt: Date.now(),
                    });
                    txCount++;
                }
            }
        }

        return {
            success: true,
            userId,
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
        const categories = await ctx.db.query("categories").collect();
        const kandang = await ctx.db.query("kandang").collect();
        const transactions = await ctx.db.query("transactions").collect();

        return {
            usersCount: users.length,
            categoriesCount: categories.length,
            kandangCount: kandang.length,
            transactionsCount: transactions.length,
            headOwner: users.find((u) => u.role === "head_owner"),
            kandangList: kandang.map((k) => ({ _id: k._id, name: k.name })),
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

        // Hapus kandang members
        const members = await ctx.db.query("kandangMembers").collect();
        for (const m of members) {
            await ctx.db.delete(m._id);
        }

        // Hapus kandang
        const kandang = await ctx.db.query("kandang").collect();
        for (const k of kandang) {
            await ctx.db.delete(k._id);
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
                members: members.length,
                kandang: kandang.length,
                categories: categories.length,
                users: users.length
            }
        };
    },
});
