const db = require('./src/config/db');

async function addTaxSetting() {
  try {
    const existing = await db('settings').where({ key: 'market_tax_percent' }).first();
    if (!existing) {
      await db('settings').insert({ key: 'market_tax_percent', value: '5' });
      console.log('Added market_tax_percent setting (default 5%)');
    } else {
      console.log('market_tax_percent already exists');
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

addTaxSetting();
