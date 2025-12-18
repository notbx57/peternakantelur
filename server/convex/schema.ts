import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // Tabel users - nyimpen data user yang login
    users: defineTable({
        email: v.string(),
        username: v.string(), // Username unique buat login
        name: v.string(),
        passwordHash: v.string(), // Password yang udah di-hash pake bcrypt
        role: v.union(
            v.literal("head_owner"),
            v.literal("co_owner"),
            v.literal("investor"),
            v.literal("user") // Default role buat user baru
        ),
        avatar: v.optional(v.string()),
        phoneNumber: v.optional(v.string()), // Nomor HP opsional
        createdAt: v.number(),
    })
        .index("by_email", ["email"])
        .index("by_username", ["username"]),

    // Tabel kandang - buat nyimpen data kandang ayam
    kandang: defineTable({
        name: v.string(),
        headOwnerId: v.id("users"),
        description: v.optional(v.string()),
        isActive: v.boolean(),
        createdAt: v.number(),
    })
        .index("by_headOwner", ["headOwnerId"]),

    // Tabel member kandang - buat nyimpen co-owner sama investor
    kandangMembers: defineTable({
        kandangId: v.id("kandang"),
        userId: v.id("users"),
        role: v.union(v.literal("co_owner"), v.literal("investor")),
        addedAt: v.number(),
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

    // Tabel notifikasi - buat request investor dan response-nya 🔔
    notifications: defineTable({
        fromUserId: v.id("users"), // User yang ngirim request
        toUserId: v.id("users"), // Head owner yang nerima
        kandangId: v.id("kandang"), // Kandang yang di-request
        type: v.union(
            v.literal("investor_request"), // Request dari user
            v.literal("request_accepted"), // Di-approve head owner
            v.literal("request_rejected") // Di-reject head owner
        ),
        message: v.string(),
        isRead: v.boolean(),
        createdAt: v.number(),
    })
        .index("by_toUser", ["toUserId"])
        .index("by_toUser_unread", ["toUserId", "isRead"])
        .index("by_fromUser", ["fromUserId"])
        .index("by_kandang", ["kandangId"]),
});
