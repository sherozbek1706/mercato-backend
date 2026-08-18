const RECIPES = {
  1: { consume: [], produce: [{ item_id: 1, qty: 5 }, { item_id: 2, qty: 2 }], energy_cost: 10 },
  2: { consume: [{ item_id: 1, qty: 3 }], produce: [{ item_id: 3, qty: 3 }], energy_cost: 10 },
  3: { consume: [{ item_id: 3, qty: 2 }], produce: [{ item_id: 4, qty: 2 }], energy_cost: 15 },
  4: { consume: [], produce: [{ item_id: 5, qty: 4 }, { item_id: 6, qty: 2 }], energy_cost: 12 },
  5: { consume: [], produce: [{ item_id: 7, qty: 4 }], energy_cost: 10 },
  6: { consume: [{ item_id: 6, qty: 2 }, { item_id: 7, qty: 1 }], produce: [{ item_id: 8, qty: 1 }], energy_cost: 20 },
};

exports.up = async function(knex) {
  await knex.schema.alterTable('professions', (table) => {
    table.integer('energy_cost').defaultTo(10);
    table.jsonb('consume').defaultTo('[]');
    table.jsonb('produce').defaultTo('[]');
  });

  // Seed existing recipes
  for (const [profId, recipe] of Object.entries(RECIPES)) {
    await knex('professions').where({ id: parseInt(profId) }).update({
      energy_cost: recipe.energy_cost,
      consume: JSON.stringify(recipe.consume),
      produce: JSON.stringify(recipe.produce)
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.alterTable('professions', (table) => {
    table.dropColumn('energy_cost');
    table.dropColumn('consume');
    table.dropColumn('produce');
  });
};
