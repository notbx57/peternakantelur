import { query } from "./_generated/server";
import { v } from "convex/values";

export const checkData = query({
    args: {},
    handler: async (ctx) => {
        // 1. Cek Market dengan handle 'kampungendokllc'
        const marketLLC = await ctx.db
            .query("markets")
            .withIndex("by_handle", (q) => q.eq("handle", "kampungendokllc"))
            .first();

        // 2. Cek semua market milik user
        const allMarkets = await ctx.db.query("markets").collect();

        // 3. Cek semua kandang
        const allKandang = await ctx.db.query("kandang").collect();

        return {
            marketLLC: marketLLC ? { _id: marketLLC._id, name: marketLLC.name } : "Not Found",
            allMarkets: allMarkets.map(m => ({ _id: m._id, name: m.name, handle: m.handle })),
            allKandang: allKandang.map(k => ({ _id: k._id, name: k.name, marketId: k.marketId })),
        };
    },
});
