import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper: Validasi format handle (lowercase, alphanumeric, underscore, min 3 max 30)
function validateHandle(handle: string): { valid: boolean; message?: string } {
    if (handle.length < 3) {
        return { valid: false, message: "Handle minimal 3 karakter" };
    }
    if (handle.length > 30) {
        return { valid: false, message: "Handle maksimal 30 karakter" };
    }
    // Hanya lowercase, angka, dan underscore
    const handleRegex = /^[a-z0-9_]+$/;
    if (!handleRegex.test(handle)) {
        return { valid: false, message: "Handle hanya boleh huruf kecil, angka, dan underscore" };
    }
    return { valid: true };
}

// Query: Ambil semua market yang aktif (global list)
export const getMarkets = query({
    args: {},
    handler: async (ctx) => {
        const markets = await ctx.db
            .query("markets")
            .filter((q) => q.eq(q.field("isActive"), true))
            .order("desc")
            .collect();

        // Ambil info owner untuk setiap market
        const marketsWithDetails = await Promise.all(
            markets.map(async (market) => {
                const owner = await ctx.db.get(market.ownerId);

                // Hitung jumlah kandang
                const kandangList = await ctx.db
                    .query("kandang")
                    .withIndex("by_market", (q) => q.eq("marketId", market._id))
                    .collect();

                // Cari ROI tertinggi dari semua kandang
                let bestROI = 0;
                let bestKandangName = "";

                for (const kandang of kandangList) {
                    // Ambil transaksi
                    const transactions = await ctx.db
                        .query("transactions")
                        .withIndex("by_kandang", (q) => q.eq("kandangId", kandang._id))
                        .collect();

                    let income = 0;
                    let expense = 0;
                    for (const tx of transactions) {
                        if (tx.type === "income") income += tx.amount;
                        else expense += tx.amount;
                    }
                    const profit = income - expense;

                    // Ambil investasi
                    const investors = await ctx.db
                        .query("kandangInvestors")
                        .withIndex("by_kandang", (q) => q.eq("kandangId", kandang._id))
                        .collect();
                    const investment = investors.reduce((sum, inv) => sum + inv.investmentAmount, 0);

                    // Hitung ROI kandang ini
                    const roi = investment > 0 ? (profit / investment) * 100 : 0;

                    // Simpan jika ROI tertinggi
                    if (roi > bestROI || bestKandangName === "") {
                        bestROI = roi;
                        bestKandangName = kandang.name;
                    }
                }

                return {
                    ...market,
                    owner: owner ? {
                        _id: owner._id,
                        name: owner.name,
                        username: owner.username,
                        avatar: owner.avatar
                    } : null,
                    kandangCount: kandangList.length,
                    productCount: 0, // Placeholder
                    prediction: Math.round(bestROI * 10) / 10, // ROI kandang terbaik
                    bestKandangName, // Nama kandang dengan ROI tertinggi
                };
            })
        );

        return marketsWithDetails;
    },
});

// Query: Ambil market milik user tertentu
export const getMyMarkets = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        // 1. Ambil market dimana user adalah HEAD OWNER
        const ownedMarkets = await ctx.db
            .query("markets")
            .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
            .collect();

        // 2. Ambil market dimana user adalah CO-OWNER
        const memberships = await ctx.db
            .query("marketMembers")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        // Filter hanya yang role-nya "co_owner" (schema bilang emang literal co_owner sih)
        const coOwnedMarketIds = memberships
            .filter((m) => m.role === "co_owner")
            .map((m) => m.marketId);

        // Fetch detail marketnya
        const coOwnedMarkets: any[] = [];
        for (const id of coOwnedMarketIds) {
            const m = await ctx.db.get(id);
            if (m && m.isActive) {
                coOwnedMarkets.push(m);
            }
        }

        // 3. Gabungkan dan return (pastikan unique, meski logic harusnya ga bikin duplikat)
        // Convex queries return objects with unique _id so checks are easy if needed.
        // Tapi owner ga mungkin ada di marketMembers untuk market dia sendiri (logic addCoOwner nahan)

        return [...ownedMarkets, ...coOwnedMarkets];
    },
});

// Query: Ambil detail satu market by ID
export const getMarketById = query({
    args: { marketId: v.id("markets") },
    handler: async (ctx, args) => {
        const market = await ctx.db.get(args.marketId);
        if (!market) return null;

        const owner = await ctx.db.get(market.ownerId);

        // Hitung jumlah kandang dalam market ini
        const kandangList = await ctx.db
            .query("kandang")
            .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
            .collect();

        return {
            ...market,
            owner: owner ? {
                _id: owner._id,
                name: owner.name,
                username: owner.username,
                avatar: owner.avatar
            } : null,
            kandangCount: kandangList.length,
        };
    },
});

// Query: Ambil market by handle (@username)
export const getMarketByHandle = query({
    args: { handle: v.string() },
    handler: async (ctx, args) => {
        // Normalize handle (lowercase, hapus @ kalo ada)
        const normalizedHandle = args.handle.toLowerCase().replace(/^@/, "");

        const market = await ctx.db
            .query("markets")
            .withIndex("by_handle", (q) => q.eq("handle", normalizedHandle))
            .first();

        if (!market) return null;

        const owner = await ctx.db.get(market.ownerId);

        // Hitung jumlah kandang dalam market ini
        const kandangList = await ctx.db
            .query("kandang")
            .withIndex("by_market", (q) => q.eq("marketId", market._id))
            .collect();

        return {
            ...market,
            owner: owner ? {
                _id: owner._id,
                name: owner.name,
                username: owner.username,
                avatar: owner.avatar
            } : null,
            kandangCount: kandangList.length,
        };
    },
});

// Mutation: Buat market baru (max 2 per user)
export const createMarket = mutation({
    args: {
        name: v.string(),
        handle: v.string(),
        description: v.optional(v.string()),
        logo: v.optional(v.string()),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        // Validasi handle
        const normalizedHandle = args.handle.toLowerCase().replace(/^@/, "");
        const validation = validateHandle(normalizedHandle);
        if (!validation.valid) {
            throw new Error(validation.message!);
        }

        // Cek handle udah dipakai belum
        const existingHandle = await ctx.db
            .query("markets")
            .withIndex("by_handle", (q) => q.eq("handle", normalizedHandle))
            .first();

        if (existingHandle) {
            throw new Error("Handle sudah dipakai! Coba yang lain.");
        }

        // Cek jumlah market yang dimiliki user
        const existingMarkets = await ctx.db
            .query("markets")
            .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
            .collect();

        if (existingMarkets.length >= 2) {
            throw new Error("Kamu sudah punya 2 market. Maksimal 2 market per user!");
        }

        // Buat market baru
        const marketId = await ctx.db.insert("markets", {
            name: args.name,
            handle: normalizedHandle,
            description: args.description,
            logo: args.logo,
            ownerId: args.userId,
            isActive: true,
            createdAt: Date.now(),
        });

        return marketId;
    },
});

// Mutation: Update market (hanya owner yang bisa)
export const updateMarket = mutation({
    args: {
        marketId: v.id("markets"),
        name: v.optional(v.string()),
        handle: v.optional(v.string()),
        description: v.optional(v.string()),
        logo: v.optional(v.string()),
        logoStorageId: v.optional(v.id("_storage")),
        isActive: v.optional(v.boolean()),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const market = await ctx.db.get(args.marketId);
        if (!market) {
            throw new Error("Market tidak ditemukan!");
        }

        // Cek apakah user adalah owner
        // Cek apakah user adalah owner
        let isAllowed = false;

        if (market.ownerId === args.userId) {
            isAllowed = true;
        } else {
            // Cek apakah user adalah co-owner
            const membership = await ctx.db
                .query("marketMembers")
                .withIndex("by_market_user", (q) =>
                    q.eq("marketId", args.marketId).eq("userId", args.userId)
                )
                .first();

            if (membership && membership.role === "co_owner") {
                isAllowed = true;
            }
        }

        if (!isAllowed) {
            throw new Error("Hanya owner atau co-owner yang bisa mengedit market ini!");
        }

        // Update field yang diberikan
        const updates: Record<string, unknown> = {};
        if (args.name !== undefined) updates.name = args.name;
        if (args.description !== undefined) updates.description = args.description;
        if (args.logo !== undefined) updates.logo = args.logo;

        // Logic update logo via Storage ID
        if (args.logoStorageId) {
            // 1. Hapus logo lama jika ada & hosted di Convex
            if (market.logo) {
                try {
                    const urlParts = market.logo.split('/');
                    const oldStorageId = urlParts[urlParts.length - 1];
                    if (oldStorageId && oldStorageId.startsWith('kg')) {
                        await ctx.storage.delete(oldStorageId as any);
                    }
                } catch (e) {
                    console.error("Gagal hapus logo lama:", e);
                }
            }

            // 2. Get URL baru
            const logoUrl = await ctx.storage.getUrl(args.logoStorageId);
            if (!logoUrl) throw new Error("Gagal mengambil URL logo");

            updates.logo = logoUrl;
        }
        if (args.isActive !== undefined) updates.isActive = args.isActive;

        // Handle update dengan validasi
        if (args.handle !== undefined) {
            const normalizedHandle = args.handle.toLowerCase().replace(/^@/, "");

            // Skip kalau handle sama
            if (normalizedHandle !== market.handle) {
                const validation = validateHandle(normalizedHandle);
                if (!validation.valid) {
                    throw new Error(validation.message!);
                }

                // Cek handle udah dipakai belum (oleh market lain)
                const existingHandle = await ctx.db
                    .query("markets")
                    .withIndex("by_handle", (q) => q.eq("handle", normalizedHandle))
                    .first();

                if (existingHandle && existingHandle._id !== args.marketId) {
                    throw new Error("Handle sudah dipakai! Coba yang lain.");
                }

                updates.handle = normalizedHandle;
            }
        }

        await ctx.db.patch(args.marketId, updates);
        return args.marketId;
    },
});

// Mutation: Hapus market (hanya owner yang bisa)
export const deleteMarket = mutation({
    args: {
        marketId: v.id("markets"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const market = await ctx.db.get(args.marketId);
        if (!market) {
            throw new Error("Market tidak ditemukan!");
        }

        // Cek apakah user adalah owner
        if (market.ownerId !== args.userId) {
            throw new Error("Hanya owner yang bisa menghapus market ini!");
        }

        // Soft delete - set isActive = false
        await ctx.db.patch(args.marketId, { isActive: false });
        return args.marketId;
    },
});

// Helper buat upload image (generate URL)
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

// Query: Cek berapa market yang dimiliki user
export const getMarketCount = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        // 1. Owned markets
        const ownedMarkets = await ctx.db
            .query("markets")
            .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

        // 2. Co-owned markets
        const memberships = await ctx.db
            .query("marketMembers")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const coOwnedCount = memberships.filter(m => m.role === "co_owner").length;

        const totalCount = ownedMarkets.length + coOwnedCount;

        return {
            count: totalCount,
            canCreate: ownedMarkets.length < 2, // Batasan create tetap berdasarkan OWNED markets
        };
    },
});

// Query: Cek apakah handle tersedia
export const checkHandleAvailable = query({
    args: { handle: v.string() },
    handler: async (ctx, args) => {
        const normalizedHandle = args.handle.toLowerCase().replace(/^@/, "");

        const validation = validateHandle(normalizedHandle);
        if (!validation.valid) {
            return { available: false, message: validation.message };
        }

        const existing = await ctx.db
            .query("markets")
            .withIndex("by_handle", (q) => q.eq("handle", normalizedHandle))
            .first();

        return {
            available: !existing,
            message: existing ? "Handle sudah dipakai" : "Handle tersedia",
        };
    },
});

// Query: Ambil semua member dalam market (Owner + Co-owners + Investors)
export const getMarketMembers = query({
    args: { marketId: v.id("markets") },
    handler: async (ctx, args) => {
        const market = await ctx.db.get(args.marketId);
        if (!market) return [];

        const members: any[] = [];
        const processedUserIds = new Set<string>();

        // 1. Head Owner
        const owner = await ctx.db.get(market.ownerId);
        if (owner) {
            members.push({
                _id: owner._id,
                name: owner.name,
                username: owner.username,
                avatar: owner.avatar,
                role: "head_owner"
            });
            processedUserIds.add(owner._id);
        }

        // 2. Co-owners (dari tabel marketMembers)
        const coOwners = await ctx.db
            .query("marketMembers")
            .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
            .collect();

        for (const co of coOwners) {
            if (!processedUserIds.has(co.userId)) {
                const user = await ctx.db.get(co.userId);
                if (user) {
                    members.push({
                        _id: user._id,
                        name: user.name,
                        username: user.username,
                        avatar: user.avatar,
                        role: "co_owner"
                    });
                    processedUserIds.add(co.userId);
                }
            }
        }

        // 3. Investors (semua user yang invest di kandang-kandang market ini)
        // Ambil list kandang di market ini
        const kandangList = await ctx.db
            .query("kandang")
            .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
            .collect();

        // Ambil investor dari setiap kandang
        for (const k of kandangList) {
            const investors = await ctx.db
                .query("kandangInvestors")
                .withIndex("by_kandang", (q) => q.eq("kandangId", k._id))
                .collect();

            for (const inv of investors) {
                if (!processedUserIds.has(inv.userId)) {
                    const user = await ctx.db.get(inv.userId);
                    if (user) {
                        members.push({
                            _id: user._id,
                            name: user.name,
                            username: user.username,
                            avatar: user.avatar,
                            role: "investor"
                        });
                        processedUserIds.add(inv.userId);
                    }
                }
            }
        }

        return members;
    },
});

// Mutation: Tambah co-owner langsung ke market (tanpa approval)
// Hanya head owner yang bisa invite
export const addCoOwner = mutation({
    args: {
        marketId: v.id("markets"),
        userId: v.id("users"),      // User yang diinvite jadi co-owner
        invitedBy: v.id("users"),   // User yang invite (harus head owner)
    },
    handler: async (ctx, args) => {
        // 1. Validasi market exists
        const market = await ctx.db.get(args.marketId);
        if (!market) {
            throw new Error("Market tidak ditemukan");
        }

        // 2. Cek invitedBy adalah head owner market
        if (market.ownerId !== args.invitedBy) {
            throw new Error("Hanya head owner yang bisa invite member");
        }

        // 3. Cek user tidak invite diri sendiri
        if (args.userId === args.invitedBy) {
            throw new Error("Tidak bisa invite diri sendiri");
        }

        // 4. Cek user yang diinvite ada
        const invitedUser = await ctx.db.get(args.userId);
        if (!invitedUser) {
            throw new Error("User tidak ditemukan");
        }

        // 5. Cek user belum jadi co-owner di market ini
        const existing = await ctx.db
            .query("marketMembers")
            .withIndex("by_market_user", (q) =>
                q.eq("marketId", args.marketId).eq("userId", args.userId)
            )
            .first();

        if (existing) {
            throw new Error("User sudah menjadi co-owner di market ini");
        }

        // 6. Insert ke marketMembers - langsung jadi co-owner!
        const memberId = await ctx.db.insert("marketMembers", {
            marketId: args.marketId,
            userId: args.userId,
            role: "co_owner",
            addedAt: Date.now()
        });

        return memberId;
    },
});
