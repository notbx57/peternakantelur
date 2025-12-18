import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Ambil user berdasarkan email - biar bisa cek user udah ada atau belum
export const getByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();
    },
});

// Ambil user berdasarkan username - buat login
export const getByUsername = query({
    args: { username: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", args.username))
            .first();
    },
});

// Create user baru - dipake pas register
export const create = mutation({
    args: {
        email: v.string(),
        username: v.string(),
        name: v.string(),
        passwordHash: v.string(),
    },
    handler: async (ctx, args) => {
        // Cek dulu email udah kepake belum
        const existingEmail = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (existingEmail) {
            throw new Error("Email sudah terdaftar");
        }

        // Cek username udah kepake belum
        const existingUsername = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", args.username))
            .first();

        if (existingUsername) {
            throw new Error("Username sudah dipakai");
        }

        // Bikin user baru - default role user (harus request buat jadi investor)
        return await ctx.db.insert("users", {
            email: args.email,
            username: args.username,
            name: args.name,
            passwordHash: args.passwordHash,
            role: "user",
            createdAt: Date.now(),
        });
    },
});

// Ambil user pake ID - simple banget
export const get = query({
    args: { id: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

// Update role user - cuma head_owner yang boleh ganti role orang
export const updateRole = mutation({
    args: {
        userId: v.id("users"),
        role: v.union(v.literal("head_owner"), v.literal("co_owner"), v.literal("investor")),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, { role: args.role });
    },
});

// Edit profil user - bisa ganti nama, avatar, sama nomor HP
// Role ga bisa diedit di sini, harus lewat updateRole
export const updateProfile = mutation({
    args: {
        userId: v.id("users"),
        name: v.optional(v.string()),
        avatar: v.optional(v.string()),
        phoneNumber: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw new Error("User tidak ditemukan");
        }

        const updates: Record<string, any> = {};
        if (args.name !== undefined) updates.name = args.name;
        if (args.avatar !== undefined) updates.avatar = args.avatar;
        if (args.phoneNumber !== undefined) updates.phoneNumber = args.phoneNumber;

        await ctx.db.patch(args.userId, updates);
        return await ctx.db.get(args.userId);
    },
});

// Update password - untuk change password functionality nanti
export const updatePassword = mutation({
    args: {
        userId: v.id("users"),
        newPasswordHash: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, { passwordHash: args.newPasswordHash });
    },
});

// Generate upload URL buat avatar - dipake sebelum upload file
// Nanti frontend kirim file ke URL ini, terus dapet storageId
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

// Update avatar pake storageId dari file yang udah di-upload
// Avatar disimpan sebagai URL dari Convex storage
// Bonus: Hapus avatar lama biar ga mubazir storage! 🗑️
export const updateAvatar = mutation({
    args: {
        userId: v.id("users"),
        storageId: v.id("_storage"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw new Error("User tidak ditemukan");
        }

        // Hapus avatar lama kalo ada (biar storage ga penuh)
        if (user.avatar) {
            try {
                // Convex storage URL format: https://{deployment}.convex.cloud/api/storage/{storageId}
                // Kita extract storageId dari URL
                const urlParts = user.avatar.split('/');
                const oldStorageId = urlParts[urlParts.length - 1];

                // Cek kalo ini beneran Convex storage ID (mulai dengan 'kg')
                // Kalo dari Google atau external, skip aja
                if (oldStorageId && oldStorageId.startsWith('kg')) {
                    await ctx.storage.delete(oldStorageId as any);
                    console.log(`✅ Deleted old avatar: ${oldStorageId}`);
                }
            } catch (err) {
                // Kalo gagal hapus, ya udah skip aja
                // Yang penting avatar baru tetep ke-update
                console.error('⚠️ Gagal hapus avatar lama:', err);
            }
        }

        // Dapetin URL dari storage yang baru
        const avatarUrl = await ctx.storage.getUrl(args.storageId);

        if (!avatarUrl) {
            throw new Error("File tidak ditemukan di storage");
        }

        await ctx.db.patch(args.userId, { avatar: avatarUrl });
        return await ctx.db.get(args.userId);
    },
});


// Ambil URL avatar dari storageId - kalo masih pake storageId format lama
export const getAvatarUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    },
});

// Ambil semua users - buat pilih member di dropdown
// Berguna pas mau nambahin investor/co-owner ke kandang
export const listAll = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("users").collect();
    },
});
