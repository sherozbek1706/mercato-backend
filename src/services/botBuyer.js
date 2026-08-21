const db = require('../config/db');

const runBotBuyer = async (io) => {
  try {
    // Read settings
    const settingsRows = await db('settings').whereIn('key', ['bot_buyer_enabled', 'bot_buyer_probability', 'bot_buyer_min_qty', 'bot_buyer_max_qty', 'bot_buyer_names', 'bot_buyer_min_price', 'bot_buyer_max_price']);
    const settings = {};
    settingsRows.forEach(s => settings[s.key] = s.value);

    const isEnabled = settings['bot_buyer_enabled'] === 'true';
    if (!isEnabled) return;

    const probability = settings['bot_buyer_probability'] ? parseFloat(settings['bot_buyer_probability']) / 100 : 0.7;

    const botNamesString = settings['bot_buyer_names'] || "Ali,Hasan,Boyota,Savdogar";
    const botNames = botNamesString.split(',').map(n => n.trim()).filter(n => n);
    const finalBotName = botNames[Math.floor(Math.random() * botNames.length)] || 'Noma\'lum Xaridor';

    const minBuy = parseInt(settings['bot_buyer_min_qty'] || '1');
    const maxBuy = parseInt(settings['bot_buyer_max_qty'] || '5');
    const minPrice = parseFloat(settings['bot_buyer_min_price'] || '0.01');
    const maxPrice = parseFloat(settings['bot_buyer_max_price'] || '1000000');

    // 1. Bozordagi barcha aktiv foydalanuvchi elonlarini olish va narxi mos keladiganlarini filtrlash
    const activeListings = await db('market_listings')
      .where({ status: 'active' })
      .andWhere('price_per_unit', '>=', minPrice)
      .andWhere('price_per_unit', '<=', maxPrice)
      .join('users', 'market_listings.seller_id', 'users.id')
      .join('items', 'market_listings.item_id', 'items.id')
      .select(
        'market_listings.id', 
        'market_listings.quantity', 
        'market_listings.price_per_unit', 
        'market_listings.seller_id',
        'market_listings.item_id',
        'users.username as seller_name',
        'items.name as item_name'
      );

    if (activeListings.length === 0) return;

    // 2. Random ehtimollik
    if (Math.random() < probability) { 
      const randomListingIndex = Math.floor(Math.random() * activeListings.length);
      const listing = activeListings[randomListingIndex];

      // Random miqdorda sotib olish (minBuy dan maxBuy gacha)
      let maxToBuy = Math.min(listing.quantity, maxBuy);
      if (maxToBuy < minBuy) maxToBuy = minBuy; // ensure valid range if listing.quantity is low
      
      const quantityToBuy = Math.floor(Math.random() * (maxToBuy - minBuy + 1)) + minBuy;
      const finalQuantity = Math.min(quantityToBuy, listing.quantity); // double check we don't buy more than exists

      let seller_earnings = 0;
      let tax_percent = 5;

      await db.transaction(async (trx) => {
        // Elonni lock qilish
        const currentListing = await trx('market_listings')
          .where({ id: listing.id, status: 'active' })
          .forUpdate()
          .first();

        if (!currentListing || currentListing.quantity < finalQuantity) return;

        const total_price = Number(currentListing.price_per_unit) * finalQuantity;
        
        // Soliqni hisoblash
        const taxSetting = await trx('settings').where({ key: 'market_tax_percent' }).first();
        if (taxSetting) tax_percent = parseFloat(taxSetting.value);
        
        const tax_amount = (total_price * tax_percent) / 100;
        seller_earnings = total_price - tax_amount;

        // Sotuvchiga pul qo'shish
        await trx('users').where({ id: listing.seller_id }).increment('balance', seller_earnings);

        // Elonni yangilash
        if (currentListing.quantity === finalQuantity) {
          await trx('market_listings').where({ id: listing.id }).update({ quantity: 0, status: 'sold' });
        } else {
          await trx('market_listings').where({ id: listing.id }).decrement('quantity', finalQuantity);
        }

        // Tranzaksiya tarixiga qo'shish
        await trx('market_transactions').insert({
          buyer_id: null,
          seller_id: listing.seller_id,
          bot_seller_name: null,
          bot_buyer_name: finalBotName,
          item_id: listing.item_id,
          quantity_sold: finalQuantity,
          price_per_unit: currentListing.price_per_unit,
          total_price
        });
      });

      // Notification yuborish
      if (io && seller_earnings > 0) {
        io.to(`user_${listing.seller_id}`).emit('item_sold', {
          message: `${finalBotName} sizning ${finalQuantity} ta ${listing.item_name} mahsulotingizni sotib oldi. Hisobingizga ${seller_earnings.toFixed(2)} tushdi.`,
        });
        io.emit('market_update');
      }
    }
  } catch (error) {
    console.error('Bot buyer error:', error);
  }
};

let isBotRunning = false;

const startBotBuyer = async (io) => {
  if (isBotRunning) return;
  isBotRunning = true;

  const runLoop = async () => {
    try {
      await runBotBuyer(io);
    } catch (e) {
      console.error("Bot xaridida xatolik:", e);
    }
    
    try {
      const setting = await require('../config/db')('settings').where({ key: 'bot_buyer_interval_min' }).first();
      const intervalMin = setting ? parseFloat(setting.value) : 1;
      setTimeout(runLoop, Math.max(intervalMin * 60 * 1000, 10000)); // Minimum 10 sekund kutadi xato bulganda xam
    } catch (e) {
      setTimeout(runLoop, 60 * 1000);
    }
  };

  runLoop();
};

module.exports = { startBotBuyer };
