const db = require('./src/config/db');

async function addIconColumn() {
  try {
    const hasColumn = await db.schema.hasColumn('items', 'icon');
    if (!hasColumn) {
      await db.schema.alterTable('items', (table) => {
        table.string('icon', 10).defaultTo('📦');
      });
      console.log('Added icon column to items table');
      
      // Update existing icons based on name
      const items = await db('items').select('id', 'name');
      for (const item of items) {
        let icon = '📦';
        const name = item.name;
        if (name.includes('Non') || name.includes("Go'sht")) icon = '🍞';
        else if (name.includes("Bug'doy")) icon = '🌾';
        else if (name.includes('Paxta')) icon = '☁️';
        else if (name.includes('Tosh') || name.includes('Ruda')) icon = '🪨';
        else if (name.includes("Yog'och")) icon = '🪵';
        else if (name.includes('Kiyim') || name.includes('Mato')) icon = '👕';
        else if (name.includes('Ketmon') || name.includes('Bolta')) icon = '⛏️';
        else if (name.includes('Damlama')) icon = '🧪';
        else if (name.includes('Uzuk')) icon = '💍';
        else if (name.includes('Suv')) icon = '💧';
        
        await db('items').where({ id: item.id }).update({ icon });
      }
      console.log('Updated existing items with icons');
    } else {
      console.log('Icon column already exists');
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

addIconColumn();
