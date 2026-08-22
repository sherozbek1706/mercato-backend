exports.up = async function(knex) {
  // 1. Users jadvaliga xp va level qo'shish
  await knex.schema.alterTable('users', table => {
    table.integer('xp').defaultTo(0);
    table.integer('level').defaultTo(1);
  });

  // 2. Levels jadvali (Darajalar)
  await knex.schema.createTable('levels', table => {
    table.increments('id').primary();
    table.integer('level').notNullable().unique();
    table.integer('required_xp').notNullable();
  });

  // Default boshlang'ich darajalarni kiritish
  await knex('levels').insert([
    { level: 1, required_xp: 0 },
    { level: 2, required_xp: 1000 },
    { level: 3, required_xp: 2500 },
    { level: 4, required_xp: 5000 },
    { level: 5, required_xp: 10000 }
  ]);

  // 3. Shoh Farmoni (Shaxsiy Questlar) jadvali
  await knex.schema.createTable('quests', table => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.json('required_items').notNullable(); // [{item_id: 1, qty: 10}]
    table.integer('reward_coins').defaultTo(0);
    table.integer('reward_xp').defaultTo(0);
    table.integer('order_index').notNullable(); // 1, 2, 3..
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // 4. User Quests (O'yinchi qaysi questlarni bajargani haqida)
  await knex.schema.createTable('user_quests', table => {
    table.increments('id').primary();
    table.uuid('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('quest_id').unsigned().references('id').inTable('quests').onDelete('CASCADE');
    table.timestamp('completed_at').defaultTo(knex.fn.now());
    
    // Bitta foydalanuvchi bitta questni faqat bir marta bajara oladi
    table.unique(['user_id', 'quest_id']);
  });

  // 5. Qirollik Loyihasi (Ommaviy Questlar) jadvali
  await knex.schema.createTable('global_quests', table => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.json('required_items').notNullable(); // [{item_id: 1, target_qty: 100000}]
    table.integer('reward_coins_pool').defaultTo(0);
    table.integer('reward_xp_pool').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('end_date');
    table.timestamps(true, true);
  });

  // 6. Global Quest Contributions (Kim nima hissa qo'shgani)
  await knex.schema.createTable('global_quest_contributions', table => {
    table.increments('id').primary();
    table.integer('global_quest_id').unsigned().references('id').inTable('global_quests').onDelete('CASCADE');
    table.uuid('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('item_id').unsigned().references('id').inTable('items').onDelete('CASCADE');
    table.integer('qty').notNullable().defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('global_quest_contributions');
  await knex.schema.dropTableIfExists('global_quests');
  await knex.schema.dropTableIfExists('user_quests');
  await knex.schema.dropTableIfExists('quests');
  await knex.schema.dropTableIfExists('levels');
  
  await knex.schema.alterTable('users', table => {
    table.dropColumn('level');
    table.dropColumn('xp');
  });
};
