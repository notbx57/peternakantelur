import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Ambil semua kategori - buat nampilin di dropdown
export const list = query({
    handler: async (ctx) => {
        return await ctx.db.query("categories").collect();
    },
});

// Ambil kategori berdasarkan tipe - income apa expense
export const listByType = query({
    args: { type: v.union(v.literal("income"), v.literal("expense")) },
    handler: async (ctx, args) => {
        const all = await ctx.db.query("categories").collect();
        return all.filter((c) => c.type === args.type);
    },
});

// Bikin kategori baru - jarang dipake sih, seed aja udah cukup
export const create = mutation({
    args: {
        name: v.string(),
        icon: v.string(),
        color: v.string(),
        type: v.union(v.literal("income"), v.literal("expense")),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("categories", args);
    },
});

// Seed kategori default - dipanggil sekali pas awal setup
// Kalo udah ada kategori, skip aja biar ga dobel
export const seedDefaults = mutation({
    handler: async (ctx) => {
        const existing = await ctx.db.query("categories").first();
        if (existing) {
            return { message: "Kategori sudah di-seed sebelumnya" };
        }

        const defaultCategories = [
            // Kategori pengeluaran
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
            // Kategori pemasukan
            { name: "Investasi", icon: "💰", color: "#22C55E", type: "income" as const },
            { name: "Penjualan Telur", icon: "🥚", color: "#10B981", type: "income" as const },
            { name: "Penjualan Ayam", icon: "🐔", color: "#059669", type: "income" as const },
            { name: "Bunga Bank", icon: "📈", color: "#14B8A6", type: "income" as const },
            { name: "Lainnya", icon: "💵", color: "#34D399", type: "income" as const },
        ];

        for (const cat of defaultCategories) {
            await ctx.db.insert("categories", cat);
        }

        return { message: "Kategori berhasil di-seed!", count: defaultCategories.length };
    },
});
