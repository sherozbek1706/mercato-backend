const db = require('../config/db');

// Bozorga mahsulot joylashtirish
const sellItem = async (req, res) => {
  const { item_id, quantity, price_per_unit } = req.body;
  const user_id = req.user.id;

  if (!item_id || !quantity || !price_per_unit || quantity <= 0 || price_per_unit <= 0) {
    return res.status(400).json({ message: "Noto'g'ri ma'lumotlar kiritildi" });
  }

  try {
    await db.transaction(async (trx) => {
      // 1. Foydalanuvchida shuncha mahsulot bormi? (Pessimistik lock)
      const inventoryItem = await trx('inventory')
        .where({ user_id, item_id })
        .forUpdate()
        .first();

      if (!inventoryItem || inventoryItem.quantity < quantity) {
        throw new Error("Sizda yetarlicha mahsulot yo'q");
      }

      // 2. Inventardan mahsulotni ayirish
      await trx('inventory')
        .where({ user_id, item_id })
        .decrement('quantity', quantity);

      // 3. Bozorga taklif qo'shish
      await trx('market_listings').insert({
        seller_id: user_id,
        item_id,
        quantity,
        price_per_unit,
        status: 'active'
      });
    });

    res.status(201).json({ message: "Mahsulot bozorga joylandi!" });
    
    // Bozordagi barcha foydalanuvchilarga yangilanish haqida xabar berish
    const io = req.app.get('io');
    if (io) {
      io.emit('market_update');
    }
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || 'Server xatosi' });
  }
};

// Bozordan mahsulot sotib olish
const buyItem = async (req, res) => {
  const listing_id = req.params.id;
  const { quantity_to_buy } = req.body; // Qancha olmoqchi
  const buyer_id = req.user.id;

  if (!quantity_to_buy || quantity_to_buy <= 0) {
    return res.status(400).json({ message: "Noto'g'ri miqdor" });
  }

  const isBotListing = typeof listing_id === 'string' && listing_id.startsWith('bot_');
  const actualId = isBotListing ? parseInt(listing_id.replace('bot_', '')) : listing_id;

  try {
    let seller_id_cache = null;
    let buyer_name_cache = null;
    let item_name_cache = null;
    let total_price_cache = 0;
    let tax_percent_cache = 5;
    let seller_earnings_cache = 0;

    await db.transaction(async (trx) => {
      let item_id, price_per_unit, bot_seller_name = null;
      
      const buyer = await trx('users').where({ id: buyer_id }).forUpdate().first();
      buyer_name_cache = buyer.username;

      if (isBotListing) {
        const botListing = await trx('bot_listings').where({ id: actualId, is_active: true }).forUpdate().first();
        if (!botListing) throw new Error("Bozorda bu mahsulot endi yo'q (Bot o'chirilgan)");
        
        item_id = botListing.item_id;
        price_per_unit = botListing.price_per_unit;
        bot_seller_name = botListing.bot_name;
      } else {
        const listing = await trx('market_listings')
          .where({ id: actualId, status: 'active' })
          .forUpdate()
          .first();

        if (!listing || listing.quantity < quantity_to_buy) {
          throw new Error("Bozorda yetarli mahsulot yo'q yoki sotib bo'lingan");
        }
        
        seller_id_cache = listing.seller_id;
        if (listing.seller_id === buyer_id) {
          throw new Error("O'zingizning mahsulotingizni sotib ololmaysiz");
        }
        
        item_id = listing.item_id;
        price_per_unit = listing.price_per_unit;

        // Xaridordan pulni yechish va sotuvchiga pulni qo'shish is done below
      }

      const total_price = Number(price_per_unit) * quantity_to_buy;

      if (buyer.balance < total_price) {
        throw new Error("Hisobingizda mablag' yetarli emas");
      }

      const item = await trx('items').where({ id: item_id }).first();
      item_name_cache = item ? item.name : 'mahsulot';

      await trx('users').where({ id: buyer_id }).decrement('balance', total_price);

      let tax_amount = 0;
      let tax_percent = 5; // Default fallback
      const taxSetting = await trx('settings').where({ key: 'market_tax_percent' }).first();
      if (taxSetting) tax_percent = parseFloat(taxSetting.value);
      tax_percent_cache = tax_percent;

      if (!isBotListing) {
        tax_amount = (total_price * tax_percent) / 100;
        const seller_earnings = total_price - tax_amount;
        seller_earnings_cache = seller_earnings;
        total_price_cache = total_price;

        await trx('users').where({ id: seller_id_cache }).increment('balance', seller_earnings);

        if (quantity_to_buy) {
          const listingQuantity = await trx('market_listings').where({ id: actualId }).select('quantity').first();
          if (listingQuantity.quantity === quantity_to_buy) {
            await trx('market_listings').where({ id: actualId }).update({ quantity: 0, status: 'sold' });
          } else {
            await trx('market_listings').where({ id: actualId }).decrement('quantity', quantity_to_buy);
          }
        }
      }

      const buyerInventory = await trx('inventory').where({ user_id: buyer_id, item_id }).first();
      if (buyerInventory) {
        await trx('inventory').where({ user_id: buyer_id, item_id }).increment('quantity', quantity_to_buy);
      } else {
        await trx('inventory').insert({ user_id: buyer_id, item_id, quantity: quantity_to_buy });
      }

      await trx('market_transactions').insert({
        buyer_id,
        seller_id: isBotListing ? null : seller_id_cache,
        bot_seller_name: isBotListing ? `🤖 ${bot_seller_name}` : null,
        item_id,
        quantity_sold: quantity_to_buy,
        price_per_unit,
        total_price
      });
    });

    res.json({ message: "Muvaffaqiyatli xarid qildingiz!" });

    const io = req.app.get('io');
    if (io) {
      if (!isBotListing && seller_id_cache) {
        io.to(`user_${seller_id_cache}`).emit('item_sold', {
          message: `Xushxabar! ${buyer_name_cache} sizning ${quantity_to_buy} ta ${item_name_cache} mahsulotingizni sotib oldi. ${tax_percent_cache}% soliq ushlab qolinib, hisobingizga ${seller_earnings_cache.toFixed(2)} tushdi.`,
          amount: null
        });
      }
      io.emit('market_update');
    }
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || 'Server xatosi' });
  }
};

// Barcha faol takliflarni ko'rish
const getActiveListings = async (req, res) => {
  try {
    const userListings = await db('market_listings')
      .where({ status: 'active' })
      .join('users', 'market_listings.seller_id', 'users.id')
      .join('items', 'market_listings.item_id', 'items.id')
      .select(
        'market_listings.id', 
        'items.name as item_name', 
        'items.icon as item_icon',
        'items.id as item_id',
        'market_listings.quantity', 
        'market_listings.price_per_unit', 
        'users.username as seller_name',
        'market_listings.created_at'
      );

    const botListingsRaw = await db('bot_listings')
      .where({ is_active: true })
      .join('items', 'bot_listings.item_id', 'items.id')
      .select(
        'bot_listings.id',
        'bot_listings.bot_name as seller_name',
        'items.name as item_name',
        'items.icon as item_icon',
        'items.id as item_id',
        'bot_listings.price_per_unit',
        'bot_listings.created_at'
      );

    const botListings = botListingsRaw.map(b => ({
      id: `bot_${b.id}`,
      item_name: b.item_name,
      item_icon: b.item_icon,
      item_id: b.item_id,
      quantity: 999999,
      price_per_unit: b.price_per_unit,
      seller_name: `🤖 ${b.seller_name}`,
      created_at: b.created_at,
      is_bot: true
    }));

    const listings = [...botListings, ...userListings].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(listings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

// Foydalanuvchi sotuvlar/xaridlar tarixini olish
const getMarketHistory = async (req, res) => {
  const user_id = req.user.id;
  try {
    const history = await db('market_transactions')
      .where('buyer_id', user_id)
      .orWhere('seller_id', user_id)
      .join('items', 'market_transactions.item_id', 'items.id')
      .leftJoin('users as buyer', 'market_transactions.buyer_id', 'buyer.id')
      .leftJoin('users as seller', 'market_transactions.seller_id', 'seller.id')
      .select(
        'market_transactions.id',
        'items.name as item_name',
        'items.icon as item_icon',
        'market_transactions.quantity_sold',
        'market_transactions.price_per_unit',
        'market_transactions.total_price',
        'buyer.username as buyer_name',
        'seller.username as seller_name',
        'market_transactions.bot_seller_name',
        'market_transactions.bot_buyer_name',
        'market_transactions.created_at'
      )
      .orderBy('market_transactions.created_at', 'desc');

    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

// Sotuvni bekor qilish
const cancelListing = async (req, res) => {
  const listing_id = req.params.id;
  const user_id = req.user.id;

  try {
    await db.transaction(async (trx) => {
      // 1. O'sha e'lon bormi va o'zinikimi?
      const listing = await trx('market_listings')
        .where({ id: listing_id, status: 'active', seller_id: user_id })
        .forUpdate()
        .first();

      if (!listing) {
        throw new Error("E'lon topilmadi, u allaqachon sotilgan bo'lishi mumkin.");
      }

      // 2. E'lonni o'chirish (yoki bekor qilish holatiga o'tkazish)
      await trx('market_listings').where({ id: listing_id }).del();

      // 3. Inventarga qaytarib berish
      const inventoryItem = await trx('inventory').where({ user_id, item_id: listing.item_id }).first();
      if (inventoryItem) {
        await trx('inventory').where({ user_id, item_id: listing.item_id }).increment('quantity', listing.quantity);
      } else {
        await trx('inventory').insert({ user_id, item_id: listing.item_id, quantity: listing.quantity });
      }
    });

    res.json({ message: "Sotuv bekor qilindi va mahsulot inventaringizga qaytarildi!" });
    
    // Bozor yangilanishi
    const io = req.app.get('io');
    if (io) {
      io.emit('market_update');
    }
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || 'Server xatosi' });
  }
};

const sellToBot = async (req, res) => {
  const { item_id, quantity } = req.body;
  const user_id = req.user.id;

  if (!item_id || !quantity || quantity <= 0) {
    return res.status(400).json({ message: "Noto'g'ri ma'lumotlar kiritildi" });
  }

  try {
    let earned = 0;
    let item_name = '';

    await db.transaction(async (trx) => {
      // 1. Check inventory
      const inventoryItem = await trx('inventory')
        .where({ user_id, item_id })
        .forUpdate()
        .first();

      if (!inventoryItem || inventoryItem.quantity < quantity) {
        throw new Error("Sizda yetarlicha mahsulot yo'q");
      }

      // 2. Determine price from bot_listings
      const botListing = await trx('bot_listings').where({ item_id, is_active: true }).first();
      if (!botListing) {
        throw new Error("Davlat bu mahsulotni sotib olmaydi.");
      }

      const item = await trx('items').where({ id: item_id }).first();
      item_name = item.name;

      // Calculate state buy price (e.g. 60% of bot sell price)
      const sellPricePerUnit = (parseFloat(botListing.price_per_unit) * 0.6).toFixed(2);
      earned = parseFloat(sellPricePerUnit) * quantity;

      // 3. Deduct from inventory
      if (inventoryItem.quantity === quantity) {
        await trx('inventory').where({ user_id, item_id }).del();
      } else {
        await trx('inventory').where({ user_id, item_id }).decrement('quantity', quantity);
      }

      // 4. Add money to user
      await trx('users').where({ id: user_id }).increment('balance', earned);

      // 5. Log transaction
      await trx('market_transactions').insert({
        buyer_id: null,
        seller_id: user_id,
        bot_seller_name: 'Davlat Dokoni (Xarid)',
        item_id,
        quantity_sold: quantity,
        price_per_unit: sellPricePerUnit,
        total_price: earned
      });
    });

    res.status(200).json({ message: `Mahsulot Davlatga sotildi! Hisobingizga ${earned.toFixed(2)} qo'shildi.` });
    
    const io = req.app.get('io');
    if (io) io.emit('market_update');
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || 'Server xatosi' });
  }
};

module.exports = { sellItem, buyItem, getActiveListings, getMarketHistory, cancelListing, sellToBot };
