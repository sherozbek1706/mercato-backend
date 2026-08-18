exports.up = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.bigInteger('telegram_id').unique();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('telegram_id');
  });
};
