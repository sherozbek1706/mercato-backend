const db = require('../config/db');

// --- LEVELS ---
const getLevels = async (req, res) => {
  try {
    const levels = await db('levels').orderBy('level', 'asc');
    res.json(levels);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const createOrUpdateLevel = async (req, res) => {
  const { id, level, required_xp } = req.body;
  try {
    if (id) {
      await db('levels').where({ id }).update({ level, required_xp });
    } else {
      await db('levels').insert({ level, required_xp });
    }
    res.json({ message: 'Saqlandi!' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const deleteLevel = async (req, res) => {
  try {
    await db('levels').where({ id: req.params.id }).del();
    res.json({ message: 'O\'chirildi!' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};


// --- QUESTS (Shoh Farmoni) ---
const getQuests = async (req, res) => {
  try {
    const quests = await db('quests').orderBy('order_index', 'asc');
    res.json(quests);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const createOrUpdateQuest = async (req, res) => {
  const { id, title, description, required_items, reward_coins, reward_xp, order_index, is_active } = req.body;
  try {
    const itemsJson = typeof required_items === 'string' ? required_items : JSON.stringify(required_items);
    if (id) {
      await db('quests').where({ id }).update({
        title, description, required_items: itemsJson, reward_coins, reward_xp, order_index, is_active
      });
    } else {
      await db('quests').insert({
        title, description, required_items: itemsJson, reward_coins, reward_xp, order_index, is_active
      });
    }
    res.json({ message: 'Saqlandi!' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const deleteQuest = async (req, res) => {
  try {
    await db('quests').where({ id: req.params.id }).del();
    res.json({ message: 'O\'chirildi!' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};


// --- GLOBAL QUESTS (Qirollik Loyihasi) ---
const getGlobalQuests = async (req, res) => {
  try {
    const quests = await db('global_quests').orderBy('id', 'desc');
    // For each, get total contributions
    for (let q of quests) {
       const sum = await db('global_quest_contributions').where({ global_quest_id: q.id }).sum('qty as total_qty');
       q.current_qty = sum[0].total_qty || 0;
    }
    res.json(quests);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const createOrUpdateGlobalQuest = async (req, res) => {
  const { id, title, description, required_items, reward_coins_pool, reward_xp_pool, is_active, end_date } = req.body;
  try {
    const itemsJson = typeof required_items === 'string' ? required_items : JSON.stringify(required_items);
    if (id) {
      await db('global_quests').where({ id }).update({
        title, description, required_items: itemsJson, reward_coins_pool, reward_xp_pool, is_active, end_date
      });
    } else {
      await db('global_quests').insert({
        title, description, required_items: itemsJson, reward_coins_pool, reward_xp_pool, is_active, end_date
      });
    }
    res.json({ message: 'Saqlandi!' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

const deleteGlobalQuest = async (req, res) => {
  try {
    await db('global_quests').where({ id: req.params.id }).del();
    res.json({ message: 'O\'chirildi!' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

module.exports = {
  getLevels, createOrUpdateLevel, deleteLevel,
  getQuests, createOrUpdateQuest, deleteQuest,
  getGlobalQuests, createOrUpdateGlobalQuest, deleteGlobalQuest
};
