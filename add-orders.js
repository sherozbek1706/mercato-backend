const db = require('./src/config/db');

async function createStateOrders() {
  try {
    const hasTable = await db.schema.hasTable('state_orders');
    if (!hasTable) {
      await db.schema.createTable('state_orders', (table) => {
        table.increments('id').primary();
        table.integer('item_id').unsigned().references('id').inTable('items').onDelete('CASCADE');
        table.integer('quantity_required').notNullable();
        table.integer('quantity_fulfilled').defaultTo(0);
        table.decimal('reward_per_unit', 10, 2).notNullable();
        table.boolean('is_active').defaultTo(true);
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
      console.log('Created state_orders table');
    } else {
      console.log('state_orders table already exists');
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

createStateOrders();
