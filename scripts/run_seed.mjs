// Script untuk seed database dari import_data.json
// Jalankan dari folder server: node ../scripts/run_seed.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConvexHttpClient } from 'convex/browser';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment dari server folder
dotenv.config({ path: path.join(__dirname, '../server/.env.local') });

async function main() {
    console.log('🗃️ Loading import_data.json...');

    // Load JSON data
    const jsonPath = path.join(__dirname, 'import_data.json');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    console.log(`📦 Found ${data.transactions.length} transactions for kandang: ${data.kandang.join(', ')}`);

    // Create Convex client
    const convexUrl = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
        console.error('❌ CONVEX_URL not found. Using hardcoded URL for dev...');
    }

    // Read .env.local untuk dapetin URL
    const envPath = path.join(__dirname, '../server/.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const urlMatch = envContent.match(/CONVEX_URL=(.+)/);
    const finalUrl = urlMatch ? urlMatch[1].trim() : convexUrl;

    console.log('📡 Connecting to:', finalUrl);

    const client = new ConvexHttpClient(finalUrl);

    // Seed from JSON
    console.log('\n🌱 Seeding from JSON...');
    const seedResult = await client.mutation('seed:seedFromJson', {
        transactions: data.transactions
    });

    console.log('\n✅ Seed completed!');
    console.log(`   User: ${seedResult.user.email}`);
    console.log(`   Market: ${seedResult.market.name}`);
    console.log(`   Categories: ${seedResult.categoriesCount}`);
    console.log(`   Kandang: ${seedResult.kandangCount}`);
    console.log(`   Transactions: ${seedResult.transactionsImported}`);
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
