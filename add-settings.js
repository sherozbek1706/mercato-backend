const db = require('./src/config/db');

async function createSettings() {
  try {
    const hasTable = await db.schema.hasTable('settings');
    if (!hasTable) {
      await db.schema.createTable('settings', (table) => {
        table.string('key').primary();
        table.string('value');
      });
      console.log('Created settings table');
      
      await db('settings').insert([
        { key: 'work_clicks', value: '20' },
        { key: 'eat_clicks', value: '10' }
      ]);
      console.log('Inserted default settings');
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

createSettings();
