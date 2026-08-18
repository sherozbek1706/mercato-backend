const db = require('./src/config/db');

async function addClicksColumn() {
  try {
    const hasColumn = await db.schema.hasColumn('professions', 'clicks_needed');
    if (!hasColumn) {
      await db.schema.alterTable('professions', (table) => {
        table.integer('clicks_needed').defaultTo(20);
      });
      console.log('Added clicks_needed column to professions table');
    } else {
      console.log('clicks_needed column already exists');
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

addClicksColumn();
