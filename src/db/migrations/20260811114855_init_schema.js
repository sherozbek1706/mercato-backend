exports.up = function(knex) {
  return knex.schema
    .createTable('professions', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable().unique();
      table.text('description');
    })
    .createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.string('username').notNullable().unique();
      table.string('password_hash').notNullable();
      table.integer('profession_id').unsigned().references('id').inTable('professions');
      table.decimal('balance', 14, 2).defaultTo(0);
      table.integer('energy').defaultTo(100);
      table.integer('max_energy').defaultTo(100);
      table.timestamps(true, true);
    })
    .createTable('items', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable().unique();
      table.enum('type', ['resource', 'food', 'tool']).notNullable();
      table.integer('energy_value').defaultTo(0); // non uchun kerak
      table.text('description');
    })
    .createTable('inventory', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.integer('item_id').unsigned().references('id').inTable('items').onDelete('CASCADE');
      table.integer('quantity').defaultTo(0);
      table.unique(['user_id', 'item_id']);
    })
    .createTable('market_listings', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('seller_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.integer('item_id').unsigned().references('id').inTable('items').onDelete('CASCADE');
      table.integer('quantity').notNullable();
      table.decimal('price_per_unit', 10, 2).notNullable();
      table.enum('status', ['active', 'sold', 'cancelled']).defaultTo('active');
      table.timestamps(true, true);
    })
    .createTable('market_transactions', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('buyer_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
      table.uuid('seller_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
      table.integer('item_id').unsigned().references('id').inTable('items');
      table.integer('quantity_sold').notNullable();
      table.decimal('price_per_unit', 10, 2).notNullable();
      table.decimal('total_price', 14, 2).notNullable();
      table.timestamps(true, true);
    })
    .createTable('production_buildings', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.string('building_type').notNullable();
      table.integer('level').defaultTo(1);
      table.integer('npc_workers_count').defaultTo(0);
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('production_buildings')
    .dropTableIfExists('market_transactions')
    .dropTableIfExists('market_listings')
    .dropTableIfExists('inventory')
    .dropTableIfExists('items')
    .dropTableIfExists('users')
    .dropTableIfExists('professions');
};
