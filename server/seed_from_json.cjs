// Script untuk seed database dari import_data.json
// Jalankan dari folder server: node seed_from_json.cjs

const fs = require('fs');
const path = require('path');
const { ConvexHttpClient } = require('convex/browser');

async function main() {
    console.log('🗃️ Loading import_data.json...');

    // Load JSON data
    const jsonPath = path.join(__dirname, '../scripts/import_data.json');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    console.log(`📦 Found ${data.transactions.length} transactions for kandang: ${data.kandang.join(', ')}`);

    // Read .env.local untuk dapetin URL
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const urlMatch = envContent.match(/CONVEX_URL=(.+)/);

    if (!urlMatch) {
        console.error('❌ CONVEX_URL not found in .env.local');
        process.exit(1);
    }

    const convexUrl = urlMatch[1].trim();
    console.log('📡 Connecting to:', convexUrl);

    const client = new ConvexHttpClient(convexUrl);

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
