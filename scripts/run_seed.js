// Script untuk seed database dari import_data.json
// Usage: node run_seed.js

const fs = require('fs');
const path = require('path');
const { ConvexHttpClient } = require('convex/browser');

// Load environment
require('dotenv').config();

async function main() {
    console.log('🗃️ Loading import_data.json...');

    // Load JSON data
    const jsonPath = path.join(__dirname, 'import_data.json');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    console.log(`📦 Found ${data.transactions.length} transactions for kandang: ${data.kandang.join(', ')}`);

    // Create Convex client
    const convexUrl = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
        console.error('❌ CONVEX_URL not found in environment');
        process.exit(1);
    }

    const client = new ConvexHttpClient(convexUrl);

    // Step 1: Clear all data
    console.log('\n🧹 Clearing existing data...');
    const clearResult = await client.mutation('seed:clearAll', {});
    console.log('✅ Cleared:', clearResult.deleted);

    // Step 2: Seed from JSON
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
