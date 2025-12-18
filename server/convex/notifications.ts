import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Ambil semua notifikasi untuk user tertentu
// Sorted by createdAt descending (terbaru dulu)
export const listForUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_toUser", (q) => q.eq("toUserId", args.userId))
            .order("desc")
            .collect();

        // Enrich dengan data user dan kandang
        const enriched = await Promise.all(
            notifications.map(async (notif) => {
                const fromUser = await ctx.db.get(notif.fromUserId);
                const kandang = await ctx.db.get(notif.kandangId);
                return {
                    ...notif,
                    fromUser,
                    kandang,
                };
            })
        );

        return enriched;
    },
});

// Hitung notifikasi yang belum dibaca
export const countUnread = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_toUser_unread", (q) =>
                q.eq("toUserId", args.userId).eq("isRead", false)
            )
            .collect();

        return unread.length;
    },
});

// User request jadi investor di kandang tertentu
// Bikin notifikasi ke head owner
// Cooldown 5 menit setelah ditolak sebelum bisa request lagi
export const requestInvestor = mutation({
    args: {
        userId: v.id("users"),
        kandangId: v.id("kandang"),
    },
    handler: async (ctx, args) => {
        const COOLDOWN_MS = 5 * 60 * 1000; // 5 menit dalam milliseconds

        // Cek kandang exist
        const kandang = await ctx.db.get(args.kandangId);
        if (!kandang) {
            throw new Error("Kandang tidak ditemukan");
        }

        // Cek user belum jadi member
        const existingMember = await ctx.db
            .query("kandangMembers")
            .withIndex("by_kandang_user", (q) =>
                q.eq("kandangId", args.kandangId).eq("userId", args.userId)
            )
            .first();

        if (existingMember) {
            throw new Error("Kamu sudah menjadi member di kandang ini");
        }

        // Cek ada pending request yang belum di-respond
        const pendingRequest = await ctx.db
            .query("notifications")
            .withIndex("by_kandang", (q) => q.eq("kandangId", args.kandangId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("fromUserId"), args.userId),
                    q.eq(q.field("type"), "investor_request"),
                    q.eq(q.field("isRead"), false) // Belum di-respond
                )
            )
            .first();

        if (pendingRequest) {
            throw new Error("Kamu sudah mengirim request sebelumnya. Tunggu respons dari Head Owner.");
        }

        // Cek cooldown jika pernah ditolak
        // Ambil notifikasi rejection terbaru untuk user ini di kandang ini
        const rejectedNotif = await ctx.db
            .query("notifications")
            .withIndex("by_kandang", (q) => q.eq("kandangId", args.kandangId))
            .filter((q) =>
                q.and(
                    q.eq(q.field("toUserId"), args.userId), // Notif ke user
                    q.eq(q.field("type"), "request_rejected")
                )
            )
            .order("desc")
            .first();

        if (rejectedNotif) {
            const timeSinceRejection = Date.now() - rejectedNotif.createdAt;
            if (timeSinceRejection < COOLDOWN_MS) {
                const remainingMs = COOLDOWN_MS - timeSinceRejection;
                const remainingMins = Math.ceil(remainingMs / 60000);
                throw new Error(`Request ditolak sebelumnya. Tunggu ${remainingMins} menit lagi.`);
            }
        }

        // Ambil data user buat message
        const user = await ctx.db.get(args.userId);

        // Kirim notifikasi ke head owner
        await ctx.db.insert("notifications", {
            fromUserId: args.userId,
            toUserId: kandang.headOwnerId,
            kandangId: args.kandangId,
            type: "investor_request",
            message: `${user?.name} ingin menjadi investor di kandang ${kandang.name}`,
            isRead: false,
            createdAt: Date.now(),
        });

        return { success: true };
    },
});

// Head owner accept request investor
export const acceptRequest = mutation({
    args: {
        notificationId: v.id("notifications"),
        headOwnerId: v.id("users"), // Buat verifikasi
    },
    handler: async (ctx, args) => {
        const notif = await ctx.db.get(args.notificationId);
        if (!notif) {
            throw new Error("Notifikasi tidak ditemukan");
        }

        if (notif.type !== "investor_request") {
            throw new Error("Ini bukan request investor");
        }

        // Verifikasi head owner
        const kandang = await ctx.db.get(notif.kandangId);
        if (!kandang || kandang.headOwnerId !== args.headOwnerId) {
            throw new Error("Kamu bukan head owner kandang ini");
        }

        // Tambahkan user sebagai investor di kandangMembers
        await ctx.db.insert("kandangMembers", {
            kandangId: notif.kandangId,
            userId: notif.fromUserId,
            role: "investor",
            addedAt: Date.now(),
        });

        // Update global role user dari 'user' ke 'investor'
        const user = await ctx.db.get(notif.fromUserId);
        if (user && user.role === "user") {
            await ctx.db.patch(notif.fromUserId, { role: "investor" });
        }

        // Update notifikasi jadi read
        await ctx.db.patch(args.notificationId, { isRead: true });

        // Kirim notifikasi ke user bahwa request diterima
        await ctx.db.insert("notifications", {
            fromUserId: args.headOwnerId,
            toUserId: notif.fromUserId,
            kandangId: notif.kandangId,
            type: "request_accepted",
            message: `Selamat! Request kamu untuk menjadi investor di ${kandang.name} telah diterima 🎉`,
            isRead: false,
            createdAt: Date.now(),
        });

        return { success: true };
    },
});

// Head owner reject request investor
export const rejectRequest = mutation({
    args: {
        notificationId: v.id("notifications"),
        headOwnerId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const notif = await ctx.db.get(args.notificationId);
        if (!notif) {
            throw new Error("Notifikasi tidak ditemukan");
        }

        if (notif.type !== "investor_request") {
            throw new Error("Ini bukan request investor");
        }

        // Verifikasi head owner
        const kandang = await ctx.db.get(notif.kandangId);
        if (!kandang || kandang.headOwnerId !== args.headOwnerId) {
            throw new Error("Kamu bukan head owner kandang ini");
        }

        // Update notifikasi jadi read
        await ctx.db.patch(args.notificationId, { isRead: true });

        // Kirim notifikasi ke user bahwa request ditolak
        await ctx.db.insert("notifications", {
            fromUserId: args.headOwnerId,
            toUserId: notif.fromUserId,
            kandangId: notif.kandangId,
            type: "request_rejected",
            message: `Maaf, request kamu untuk menjadi investor di ${kandang.name} ditolak`,
            isRead: false,
            createdAt: Date.now(),
        });

        return { success: true };
    },
});

// Mark notifikasi sebagai sudah dibaca
export const markAsRead = mutation({
    args: { notificationId: v.id("notifications") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.notificationId, { isRead: true });
    },
});

// Mark semua notifikasi user sebagai dibaca
export const markAllAsRead = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_toUser_unread", (q) =>
                q.eq("toUserId", args.userId).eq("isRead", false)
            )
            .collect();

        for (const notif of unread) {
            await ctx.db.patch(notif._id, { isRead: true });
        }

        return { marked: unread.length };
    },
});
