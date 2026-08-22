const db = require('../config/db');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  const { username, password } = req.body;
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (username === adminUsername && password === adminPassword) {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    res.json({ token, message: 'Admin panelga xush kelibsiz!' });
  } else {
    res.status(401).json({ message: 'Login yoki parol xato' });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await db('users')
      .leftJoin('professions', 'users.profession_id', 'professions.id')
      .select('users.id', 'users.username', 'users.balance', 'users.energy', 'users.profile_picture', 'users.level', 'users.xp', 'professions.name as profession_name')
      .orderBy('users.created_at', 'desc');

    // Attach current quest info
    for (let u of users) {
      const completedQuests = await db('user_quests')
        .where({ user_id: u.id })
        .join('quests', 'user_quests.quest_id', 'quests.id')
        .max('quests.order_index as max_index')
        .first();
      
      const maxCompleted = completedQuests?.max_index || 0;
      u.current_quest_index = maxCompleted + 1;
    }

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const getProfessions = async (req, res) => {
  try {
    const professions = await db('professions').orderBy('id', 'asc');
    res.json(professions);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const createOrUpdateProfession = async (req, res) => {
  const { id, name, description, energy_cost, clicks_needed, consume, produce } = req.body;
  try {
    if (id) {
      await db('professions').where({ id }).update({
        name,
        description,
        energy_cost: energy_cost || 10,
        clicks_needed: clicks_needed || 20,
        consume: consume ? JSON.stringify(consume) : '[]',
        produce: produce ? JSON.stringify(produce) : '[]'
      });
      res.json({ message: 'Kasb yangilandi!' });
    } else {
      await db('professions').insert({
        name,
        description,
        energy_cost: energy_cost || 10,
        clicks_needed: clicks_needed || 20,
        consume: consume ? JSON.stringify(consume) : '[]',
        produce: produce ? JSON.stringify(produce) : '[]'
      });
      res.json({ message: 'Yangi kasb qo\'shildi!' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const getItems = async (req, res) => {
  try {
    const items = await db('items').orderBy('id', 'asc');
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const createOrUpdateItem = async (req, res) => {
  const { id, name, icon, type, energy_value, description } = req.body;
  try {
    if (id) {
      await db('items').where({ id }).update({
        name, icon: icon || '📦', type, energy_value: energy_value || 0, description
      });
      res.json({ message: 'Mahsulot yangilandi!' });
    } else {
      await db('items').insert({
        name, icon: icon || '📦', type, energy_value: energy_value || 0, description
      });
      res.json({ message: 'Yangi mahsulot qo\'shildi!' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await db('users').where({ id }).del();
    res.json({ message: 'Foydalanuvchi o\'chirildi!' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db('users')
      .where({ 'users.id': id })
      .leftJoin('professions', 'users.profession_id', 'professions.id')
      .select(
        'users.id', 'users.username', 'users.balance', 'users.energy', 
        'users.max_energy', 'users.created_at', 'users.profile_picture', 'professions.name as profession_name'
      )
      .first();

    if (!user) {
      return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
    }

    const inventory = await db('inventory')
      .where({ user_id: id })
      .join('items', 'inventory.item_id', 'items.id')
      .select('items.name', 'items.type', 'inventory.quantity');

    res.json({ ...user, inventory });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const deleteProfession = async (req, res) => {

  try {
    const { id } = req.params;
    await db('professions').where({ id }).del();
    res.json({ message: 'Kasb o\'chirildi!' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    await db('items').where({ id }).del();
    res.json({ message: 'Mahsulot o\'chirildi!' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const getSettings = async (req, res) => {
  try {
    const settingsRows = await db('settings').select('*');
    const settings = {};
    settingsRows.forEach(s => settings[s.key] = s.value);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const updateSettings = async (req, res) => {
  const updates = req.body;
  try {
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        // Check if setting exists
        const exists = await db('settings').where({ key }).first();
        if (exists) {
          await db('settings').where({ key }).update({ value: String(value) });
        } else {
          await db('settings').insert({ key, value: String(value) });
        }
      }
    }
    res.json({ message: 'Sozlamalar yangilandi!' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const getBots = async (req, res) => {
  try {
    const bots = await db('bot_listings')
      .join('items', 'bot_listings.item_id', 'items.id')
      .select('bot_listings.*', 'items.name as item_name')
      .orderBy('bot_listings.id', 'desc');
    res.json(bots);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const createOrUpdateBot = async (req, res) => {
  const { id, bot_name, item_id, price_per_unit, is_active } = req.body;
  try {
    if (id) {
      await db('bot_listings').where({ id }).update({ bot_name, item_id, price_per_unit, is_active });
      res.json({ message: 'Bot yangilandi!' });
    } else {
      await db('bot_listings').insert({ bot_name, item_id, price_per_unit, is_active: is_active ?? true });
      res.json({ message: 'Yangi bot qo\'shildi!' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const deleteBot = async (req, res) => {
  try {
    await db('bot_listings').where({ id: req.params.id }).del();
    res.json({ message: 'Bot o\'chirildi!' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const getAdminOrders = async (req, res) => {
  try {
    const orders = await db('state_orders')
      .join('items', 'state_orders.item_id', 'items.id')
      .select('state_orders.*', 'items.name as item_name', 'items.icon as item_icon')
      .orderBy('state_orders.id', 'desc');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi' });
  }
};

const getBotPurchases = async (req, res) => {
  try {
    const purchases = await db('market_transactions')
      .whereNotNull('bot_buyer_name')
      .join('items', 'market_transactions.item_id', 'items.id')
      .join('users', 'market_transactions.seller_id', 'users.id')
      .select(
        'market_transactions.id',
        'market_transactions.bot_buyer_name',
        'market_transactions.quantity_sold',
        'market_transactions.total_price',
        'market_transactions.created_at',
        'items.name as item_name',
        'items.icon as item_icon',
        'users.username as seller_name'
      )
      .orderBy('market_transactions.created_at', 'desc')
      .limit(100);
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi' });
  }
};

const createOrUpdateAdminOrder = async (req, res) => {
  const { id, item_id, quantity_required, reward_per_unit, is_active } = req.body;
  try {
    if (id) {
      await db('state_orders').where({ id }).update({ item_id, quantity_required, reward_per_unit, is_active });
    } else {
      await db('state_orders').insert({ item_id, quantity_required, reward_per_unit, is_active });
    }
    const io = req.app.get('io');
    if (io) io.emit('orders_update');
    res.json({ message: 'Buyurtma saqlandi' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi' });
  }
};

const deleteAdminOrder = async (req, res) => {
  try {
    await db('state_orders').where({ id: req.params.id }).del();
    const io = req.app.get('io');
    if (io) io.emit('orders_update');
    res.json({ message: 'O\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi' });
  }
};

const getMarketStats = async (req, res) => {
  try {
    const stats = await db('items')
      .leftJoin('market_listings', function() {
        this.on('items.id', '=', 'market_listings.item_id').andOn('market_listings.status', '=', db.raw('?', ['active']));
      })
      .select('items.id', 'items.name', 'items.icon')
      .count('market_listings.id as total_listings')
      .sum('market_listings.quantity as total_quantity')
      .avg('market_listings.price_per_unit as avg_price')
      .min('market_listings.price_per_unit as min_price')
      .max('market_listings.price_per_unit as max_price')
      .groupBy('items.id', 'items.name', 'items.icon')
      .orderBy('items.id', 'asc');

    const botListings = await db('bot_listings').where({ is_active: true });

    // Merge bot prices into stats
    stats.forEach(s => {
      const botsForItem = botListings.filter(b => b.item_id === s.id);
      
      let total_listings = parseInt(s.total_listings || 0);
      let avg_price = parseFloat(s.avg_price || 0);
      
      if (botsForItem.length > 0) {
         const currentTotalValue = avg_price * total_listings;
         const botTotalValue = botsForItem.reduce((acc, b) => acc + parseFloat(b.price_per_unit), 0);
         
         s.total_listings = total_listings + botsForItem.length;
         s.avg_price = (currentTotalValue + botTotalValue) / s.total_listings;
         
         const botMin = Math.min(...botsForItem.map(b => parseFloat(b.price_per_unit)));
         const botMax = Math.max(...botsForItem.map(b => parseFloat(b.price_per_unit)));
         
         s.min_price = s.min_price !== null ? Math.min(parseFloat(s.min_price), botMin) : botMin;
         s.max_price = s.max_price !== null ? Math.max(parseFloat(s.max_price), botMax) : botMax;
         
         s.total_quantity = (parseInt(s.total_quantity) || 0) + 999999; // Represents infinite bot supply
      }
    });

    const professions = await db('professions').select('consume', 'produce');

    // Create a dictionary of avg_price for easy lookup
    const priceMap = {};
    stats.forEach(s => priceMap[s.id] = parseFloat(s.avg_price) || 0);

    // Map produced item_id to its recipe cost
    const costMap = {};
    professions.forEach(prof => {
      try {
        const consume = typeof prof.consume === 'string' ? JSON.parse(prof.consume || '[]') : (prof.consume || []);
        const produce = typeof prof.produce === 'string' ? JSON.parse(prof.produce || '[]') : (prof.produce || []);
        
        if (produce.length > 0) {
          const producedItem = produce[0];
          
          if (consume.length === 0) {
            costMap[producedItem.item_id] = -1; // Raw material flag
          } else {
            const totalCost = consume.reduce((acc, c) => acc + (c.qty * (priceMap[c.item_id] || 0)), 0);
            costMap[producedItem.item_id] = totalCost / producedItem.qty;
          }
        }
      } catch (e) {
        console.error("Error parsing profession recipe:", e);
      }
    });

    // Attach base_cost (tannarx) to stats
    const enrichedStats = stats.map(s => {
      let base_cost = costMap[s.id];
      if (base_cost === undefined) {
         base_cost = null; // Uncraftable or undefined
      }
      return { ...s, base_cost };
    });

    res.json(enrichedStats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, password, profession_id } = req.body;
  const bcrypt = require('bcryptjs');

  try {
    const updates = {};
    if (username) updates.username = username;
    if (profession_id !== undefined) updates.profession_id = profession_id === '' ? null : profession_id;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.password_hash = await bcrypt.hash(password, salt);
    }

    if (Object.keys(updates).length > 0) {
      await db('users').where({ id }).update(updates);
    }
    res.json({ message: "Foydalanuvchi muvaffaqiyatli yangilandi!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Xatolik yuz berdi" });
  }
};

module.exports = {
  login,
  getUsers,
  getProfessions,
  createOrUpdateProfession,
  getItems,
  createOrUpdateItem,
  deleteUser,
  updateUser,
  deleteProfession,
  deleteItem,
  getUserDetails,
  getSettings,
  updateSettings,
  getBots,
  createOrUpdateBot,
  deleteBot,
  getAdminOrders,
  getBotPurchases,
  createOrUpdateAdminOrder,
  deleteAdminOrder,
  getMarketStats
};
