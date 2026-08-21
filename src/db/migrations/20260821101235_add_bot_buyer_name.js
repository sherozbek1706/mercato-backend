exports.up = function(knex) {
  return knex.schema.alterTable('market_transactions', function(table) {
    table.string('bot_buyer_name').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('market_transactions', function(table) {
    table.dropColumn('bot_buyer_name');
  });
};
