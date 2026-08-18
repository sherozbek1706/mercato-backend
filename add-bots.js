const db = require('./src/config/db');

async function createBotListings() {
  try {
    const hasTable = await db.schema.hasTable('bot_listings');
    if (!hasTable) {
      await db.schema.createTable('bot_listings', (table) => {
        table.increments('id').primary();
        table.string('bot_name').notNullable();
        table.integer('item_id').unsigned().references('id').inTable('items').onDelete('CASCADE');
        table.decimal('price_per_unit', 10, 2).notNullable();
        table.boolean('is_active').defaultTo(true);
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
      console.log('Created bot_listings table');
    } else {
      console.log('bot_listings table already exists');
    }

    // Add seller_name to market_transactions just in case we need to store bot names
    const hasSellerName = await db.schema.hasColumn('market_transactions', 'bot_seller_name');
    if (!hasSellerName) {
      await db.schema.alterTable('market_transactions', table => {
        table.string('bot_seller_name');
      });
      console.log('Added bot_seller_name to market_transactions');
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

createBotListings();
