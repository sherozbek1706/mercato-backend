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
      .select('users.id', 'users.username', 'users.balance', 'users.energy', 'professions.name as profession_name')
      .orderBy('users.created_at', 'desc');
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
        'users.max_energy', 'users.created_at', 'professions.name as profession_name'
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
  const { work_clicks, eat_clicks, market_tax_percent } = req.body;
  try {
    if (work_clicks) await db('settings').where({ key: 'work_clicks' }).update({ value: work_clicks });
    if (eat_clicks) await db('settings').where({ key: 'eat_clicks' }).update({ value: eat_clicks });
    if (market_tax_percent !== undefined) await db('settings').where({ key: 'market_tax_percent' }).update({ value: market_tax_percent });
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

    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
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
  deleteProfession,
  deleteItem,
  getUserDetails,
  getSettings,
  updateSettings,
  getBots,
  createOrUpdateBot,
  deleteBot,
  getAdminOrders,
  createOrUpdateAdminOrder,
  deleteAdminOrder,
  getMarketStats
};
