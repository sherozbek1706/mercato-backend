const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');

const generateToken = (id, username) => {
  return jwt.sign({ id, username }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

function verifyTelegramAuth(data, botToken) {
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  
  const dataCheckString = Object.keys(data)
    .filter(key => key !== 'hash')
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('\n');
    
  const hash = crypto.createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
    
  return hash === data.hash;
}

const register = async (req, res) => {
  const { username, password, profession_id, telegramData } = req.body;

  if (!username || !password || !profession_id || !telegramData) {
    return res.status(400).json({ message: 'Iltimos, barcha maydonlarni to\'ldiring va Telegram orqali tasdiqlang' });
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ message: 'Serverda Telegram bot tokeni sozlanmagan' });
    }

    const isValid = verifyTelegramAuth(telegramData, botToken);
    if (!isValid) {
      return res.status(400).json({ message: 'Telegram avtorizatsiyasi xato (yaroqsiz so\'rov)' });
    }

    const telegramId = telegramData.id;
    const existingTgUser = await db('users').where({ telegram_id: telegramId }).first();
    if (existingTgUser) {
      return res.status(400).json({ message: 'Bu Telegram akkaunt orqali allaqachon ro\'yxatdan o\'tilgan!' });
    }

    // Check if user exists
    const userExists = await db('users').where({ username }).first();
    if (userExists) {
      return res.status(400).json({ message: 'Foydalanuvchi allaqachon mavjud' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Boshlang'ich kapital
    const initialBalance = 1000.00;

    // Transaksiya orqali user yaratamiz va kerakli inventarni beramiz
    let newUser;
    await db.transaction(async (trx) => {
      const [insertedUser] = await trx('users').insert({
        username,
        password_hash: hashedPassword,
        profession_id,
        telegram_id: telegramId,
        balance: initialBalance,
        energy: 100,
        max_energy: 100
      }).returning('*');
      
      newUser = insertedUser;
    });

    if (newUser) {
      res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        profession_id: newUser.profession_id,
        balance: newUser.balance,
        token: generateToken(newUser.id, newUser.username),
      });
    } else {
      res.status(400).json({ message: 'Foydalanuvchi ma`lumotlari xato' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await db('users').where({ username }).first();

    if (user && (await bcrypt.compare(password, user.password_hash))) {
      res.json({
        id: user.id,
        username: user.username,
        profession_id: user.profession_id,
        balance: user.balance,
        token: generateToken(user.id, user.username),
      });
    } else {
      res.status(401).json({ message: 'Username yoki parol xato' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await db('users')
      .where({ 'users.id': req.user.id })
      .leftJoin('professions', 'users.profession_id', 'professions.id')
      .select(
        'users.id', 'users.username', 'users.balance', 'users.energy', 'users.max_energy', 
        'professions.name as profession', 'professions.clicks_needed',
        'professions.energy_cost', 'professions.consume', 'professions.produce'
      )
      .first();
      
    if(!user) {
      return res.status(404).json({ message: 'User topilmadi' });
    }
    
    // Get inventory
    const inventory = await db('inventory')
      .where({ user_id: req.user.id })
      .join('items', 'inventory.item_id', 'items.id')
      .select('items.name', 'items.icon', 'items.type', 'inventory.quantity', 'items.id as item_id');
      
    // Fetch item names and icons for consume/produce to send ready text to frontend
    const allItems = await db('items').select('id', 'name', 'icon');
    const itemsMap = {};
    allItems.forEach(i => itemsMap[i.id] = { name: i.name, icon: i.icon });
    
    // Fetch average market prices for items
    const marketPrices = await db('market_listings')
      .where({ status: 'active' })
      .select('item_id')
      .count('id as listing_count')
      .avg('price_per_unit as avg_price')
      .groupBy('item_id');
      
    const botListings = await db('bot_listings').where({ is_active: true });

    const priceMap = {};
    marketPrices.forEach(m => {
      priceMap[m.item_id] = { avg: parseFloat(m.avg_price) || 0, count: parseInt(m.listing_count) || 0 };
    });

    botListings.forEach(b => {
       const bPrice = parseFloat(b.price_per_unit);
       if (!priceMap[b.item_id]) {
          priceMap[b.item_id] = { avg: bPrice, count: 1 };
       } else {
          const curr = priceMap[b.item_id];
          curr.avg = ((curr.avg * curr.count) + bPrice) / (curr.count + 1);
          curr.count += 1;
       }
    });
    
    // Flatten priceMap for easy lookup
    const finalPriceMap = {};
    Object.keys(priceMap).forEach(k => finalPriceMap[k] = priceMap[k].avg);
    
    let recipeDetails = { energy_cost: user.energy_cost, clicks_needed: user.clicks_needed, consume: [], produce: [] };
    if (user.consume) {
      const c = typeof user.consume === 'string' ? JSON.parse(user.consume) : user.consume;
      recipeDetails.consume = c.map(x => ({ 
        ...x, 
        name: itemsMap[x.item_id]?.name, 
        icon: itemsMap[x.item_id]?.icon,
        avg_price: finalPriceMap[x.item_id] || 0
      }));
    }
    if (user.produce) {
      const p = typeof user.produce === 'string' ? JSON.parse(user.produce) : user.produce;
      recipeDetails.produce = p.map(x => ({ 
        ...x, 
        name: itemsMap[x.item_id]?.name, 
        icon: itemsMap[x.item_id]?.icon,
        avg_price: finalPriceMap[x.item_id] || 0
      }));
    }

    // Fetch settings
    const settingsRows = await db('settings').select('*');
    const settings = {};
    settingsRows.forEach(s => settings[s.key] = s.value);

    res.json({ ...user, inventory, recipeDetails, settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

module.exports = { register, login, getMe };
