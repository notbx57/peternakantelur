import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // Tabel users - nyimpen data user yang login
    // Tidak ada global role! Semua user sama, role hanya ada di context market/kandang
    users: defineTable({
        email: v.string(),
        username: v.string(), // Username unique buat login
        name: v.string(),
        passwordHash: v.string(), // Password yang udah di-hash pake bcrypt
        avatar: v.optional(v.string()),
        phoneNumber: v.optional(v.string()), // Nomor HP opsional
        createdAt: v.number(),
    })
        .index("by_email", ["email"])
        .index("by_username", ["username"]),

    // Tabel markets - parent entity untuk kandang, produk, members
    // Setiap user bisa punya max 2 market
    // ownerId = head_owner market (creator)
    markets: defineTable({
        name: v.string(),
        handle: v.string(), // Unique handle seperti @kampoengendok (tanpa @)
        description: v.optional(v.string()),
        ownerId: v.id("users"),       // head_owner (creator market)
        logo: v.optional(v.string()), // URL logo market
        isActive: v.boolean(),
        createdAt: v.number(),
    })
        .index("by_owner", ["ownerId"])
        .index("by_active", ["isActive"])
        .index("by_handle", ["handle"]),

    // Tabel member market - co-owner di level market
    // Head owner tidak perlu masuk sini karena sudah ada di markets.ownerId
    marketMembers: defineTable({
        marketId: v.id("markets"),
        userId: v.id("users"),
        role: v.literal("co_owner"), // Hanya co_owner di level market
        addedAt: v.number(),
    })
        .index("by_market", ["marketId"])
        .index("by_user", ["userId"])
        .index("by_market_user", ["marketId", "userId"]),

    // Tabel kandang - buat nyimpen data kandang ayam
    // Setiap kandang WAJIB punya market
    kandang: defineTable({
        name: v.string(),
        marketId: v.id("markets"), // Relasi ke market (required!)
        description: v.optional(v.string()),
        avatar: v.optional(v.string()), // URL avatar/gambar kandang
        isActive: v.boolean(),
        createdAt: v.number(),
    })
        .index("by_market", ["marketId"]),

    // Tabel investor kandang - nyimpen siapa aja yang invest di kandang
    // Investor = user yang invest minimal di 1 kandang dalam suatu market
    kandangInvestors: defineTable({
        kandangId: v.id("kandang"),
        userId: v.id("users"),
        investmentAmount: v.number(), // Jumlah investasi
        investedAt: v.number(),
    })
        .index("by_kandang", ["kandangId"])
        .index("by_user", ["userId"])
        .index("by_kandang_user", ["kandangId", "userId"]),

    // Tabel kategori - buat nge-tag transaksi masuk/keluar
    categories: defineTable({
        name: v.string(),
        icon: v.string(),
        color: v.string(),
        type: v.union(v.literal("income"), v.literal("expense")),
    }),

    // Tabel transaksi - inti dari semua pencatatan duit masuk keluar
    transactions: defineTable({
        kandangId: v.id("kandang"),
        categoryId: v.id("categories"),
        categoryName: v.string(), // Nama kategori (denormalisasi buat gampang display)
        createdBy: v.id("users"),
        amount: v.number(),
        type: v.union(v.literal("income"), v.literal("expense")),
        description: v.string(),
        date: v.number(), // timestamp kapan transaksi terjadi
        createdAt: v.number(),
        updatedAt: v.optional(v.number()),
    })
        .index("by_kandang", ["kandangId"])
        .index("by_kandang_date", ["kandangId", "date"])
        .index("by_category", ["categoryId"]),
});
