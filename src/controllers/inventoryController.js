const db = require('../config/db');

const getInventory = async (req, res) => {
  try {
    const inventory = await db('inventory')
      .where({ user_id: req.user.id })
      .join('items', 'inventory.item_id', 'items.id')
      .select('inventory.id', 'items.name', 'items.type', 'inventory.quantity', 'items.energy_value');
      
    res.json(inventory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

module.exports = { getInventory };
