import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Ambil semua kandang yang user punya akses
// Bisa sebagai head_owner atau member (co_owner/investor)
export const listForUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        // Ambil kandang yang usernya head_owner
        const ownedKandang = await ctx.db
            .query("kandang")
            .withIndex("by_headOwner", (q) => q.eq("headOwnerId", args.userId))
            .collect();

        // Ambil kandang yang usernya jadi member
        const memberships = await ctx.db
            .query("kandangMembers")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const memberKandangIds = memberships.map((m) => m.kandangId);
        const memberKandang = await Promise.all(
            memberKandangIds.map((id) => ctx.db.get(id))
        );

        // Gabungin semua terus tandain rolenya masing-masing
        const result = [
            ...ownedKandang.map((k) => ({ ...k, userRole: "head_owner" as const })),
            ...memberKandang
                .filter((k) => k !== null)
                .map((k) => {
                    const membership = memberships.find((m) => m.kandangId === k!._id);
                    return { ...k!, userRole: membership!.role };
                }),
        ];

        return result;
    },
});

// Ambil semua kandang (public) - buat user yg mau liat list kandang
// User biasa cuma bisa liat nama, keuangan di-hide
export const listAllPublic = query({
    args: { userId: v.optional(v.id("users")) },
    handler: async (ctx, args) => {
        const allKandang = await ctx.db.query("kandang").collect();

        // Enrich dengan info head owner dan role user
        const result = await Promise.all(
            allKandang.map(async (k) => {
                const headOwner = await ctx.db.get(k.headOwnerId);

                // Cek role user di kandang ini
                let userRole: string | null = null;
                if (args.userId) {
                    const user = await ctx.db.get(args.userId);

                    if (k.headOwnerId === args.userId) {
                        userRole = "head_owner";
                    } else {
                        const membership = await ctx.db
                            .query("kandangMembers")
                            .withIndex("by_kandang_user", (q) =>
                                q.eq("kandangId", k._id).eq("userId", args.userId!)
                            )
                            .first();
                        userRole = membership?.role || null;
                    }

                    // Kalo masih belum punya role (bukan head owner/member)
                    // Cek role global di tabel users
                    if (!userRole && user?.role === "investor") {
                        userRole = "investor";
                    }
                }

                return {
                    _id: k._id,
                    name: k.name,
                    description: k.description,
                    isActive: k.isActive,
                    headOwner: headOwner ? { name: headOwner.name } : null,
                    userRole, // null = user biasa, bisa request
                };
            })
        );

        return result;
    },
});

// Ambil satu kandang - simple aja pake ID
export const get = query({
    args: { id: v.id("kandang") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

// Ambil kandang lengkap sama head owner-nya
// Dipake di halaman members buat tau siapa bosnya
export const getWithOwner = query({
    args: { id: v.id("kandang") },
    handler: async (ctx, args) => {
        const kandang = await ctx.db.get(args.id);
        if (!kandang) return null;

        const headOwner = await ctx.db.get(kandang.headOwnerId);
        return {
            ...kandang,
            headOwner
        };
    },
});

// Bikin kandang baru - cuma head_owner yang bisa
export const create = mutation({
    args: {
        name: v.string(),
        headOwnerId: v.id("users"),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("kandang", {
            name: args.name,
            headOwnerId: args.headOwnerId,
            description: args.description,
            isActive: true,
            createdAt: Date.now(),
        });
    },
});

// Update info kandang - nama, deskripsi, status aktif
export const update = mutation({
    args: {
        id: v.id("kandang"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
    },
});

// Hapus kandang - hati-hati ya, ini permanent!
export const remove = mutation({
    args: { id: v.id("kandang") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

// Ambil semua member di kandang - lengkap sama data usernya
export const getMembers = query({
    args: { kandangId: v.id("kandang") },
    handler: async (ctx, args) => {
        const members = await ctx.db
            .query("kandangMembers")
            .withIndex("by_kandang", (q) => q.eq("kandangId", args.kandangId))
            .collect();

        // Ambil detail user buat tiap member
        const result = await Promise.all(
            members.map(async (m) => {
                const user = await ctx.db.get(m.userId);
                return {
                    ...m,
                    user: user,
                };
            })
        );

        return result;
    },
});

// Tambahin member ke kandang - bisa co_owner atau investor
export const addMember = mutation({
    args: {
        kandangId: v.id("kandang"),
        userId: v.id("users"),
        role: v.union(v.literal("co_owner"), v.literal("investor")),
    },
    handler: async (ctx, args) => {
        // Cek dulu udah jadi member belum
        const existing = await ctx.db
            .query("kandangMembers")
            .withIndex("by_kandang_user", (q) =>
                q.eq("kandangId", args.kandangId).eq("userId", args.userId)
            )
            .first();

        if (existing) {
            throw new Error("User sudah menjadi member di kandang ini");
        }

        return await ctx.db.insert("kandangMembers", {
            kandangId: args.kandangId,
            userId: args.userId,
            role: args.role,
            addedAt: Date.now(),
        });
    },
});

// Ganti role member - dari investor ke co_owner atau sebaliknya
export const updateMemberRole = mutation({
    args: {
        kandangId: v.id("kandang"),
        userId: v.id("users"),
        role: v.union(v.literal("co_owner"), v.literal("investor")),
    },
    handler: async (ctx, args) => {
        const member = await ctx.db
            .query("kandangMembers")
            .withIndex("by_kandang_user", (q) =>
                q.eq("kandangId", args.kandangId).eq("userId", args.userId)
            )
            .first();

        if (!member) {
            throw new Error("Member tidak ditemukan");
        }

        await ctx.db.patch(member._id, { role: args.role });
    },
});

// Kick member dari kandang - hati2 ini harus komunikasi sama member dulu
export const removeMember = mutation({
    args: {
        kandangId: v.id("kandang"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const member = await ctx.db
            .query("kandangMembers")
            .withIndex("by_kandang_user", (q) =>
                q.eq("kandangId", args.kandangId).eq("userId", args.userId)
            )
            .first();

        if (member) {
            await ctx.db.delete(member._id);
        }
    },
});
