import { ConvexHttpClient } from 'convex/browser';

// Ambil Convex URL dari environment variable
const convexUrl = process.env.CONVEX_URL;

// Kalo ga ada CONVEX_URL, langsung stop server aja
// Ga usah lanjut kalo ga konek ke Convex
if (!convexUrl) {
    console.error('❌ CONVEX_URL not found in .env.local');
    console.error('💡 Bikin file .env.local dulu dan isi CONVEX_URL ya!');
    process.exit(1);
}

// Bikin instance Convex client buat dipake di semua route
const convex = new ConvexHttpClient(convexUrl);

console.log(`📡 Convex client initialized: ${convexUrl}`);

export default convex;
