const db = require('../config/db');

const runBotBuyer = async (io) => {
  try {
    // 1. Bozordagi barcha aktiv foydalanuvchi elonlarini olish
    const activeListings = await db('market_listings')
      .where({ status: 'active' })
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

    // 2. Random ehtimollik (masalan 70% ehtimollik bilan xarid amalga oshadi)
    if (Math.random() < 0.7) { 
      const randomListingIndex = Math.floor(Math.random() * activeListings.length);
      const listing = activeListings[randomListingIndex];

      // Random miqdorda sotib olish (1 dan listing.quantity gacha, max 5)
      const maxToBuy = Math.min(listing.quantity, 5);
      const quantityToBuy = Math.floor(Math.random() * maxToBuy) + 1;

      let seller_earnings = 0;
      let tax_percent = 5;

      await db.transaction(async (trx) => {
        // Elonni lock qilish
        const currentListing = await trx('market_listings')
          .where({ id: listing.id, status: 'active' })
          .forUpdate()
          .first();

        if (!currentListing || currentListing.quantity < quantityToBuy) return;

        const total_price = Number(currentListing.price_per_unit) * quantityToBuy;
        
        // Soliqni hisoblash
        const taxSetting = await trx('settings').where({ key: 'market_tax_percent' }).first();
        if (taxSetting) tax_percent = parseFloat(taxSetting.value);
        
        const tax_amount = (total_price * tax_percent) / 100;
        seller_earnings = total_price - tax_amount;

        // Sotuvchiga pul qo'shish
        await trx('users').where({ id: listing.seller_id }).increment('balance', seller_earnings);

        // Elonni yangilash
        if (currentListing.quantity === quantityToBuy) {
          await trx('market_listings').where({ id: listing.id }).update({ quantity: 0, status: 'sold' });
        } else {
          await trx('market_listings').where({ id: listing.id }).decrement('quantity', quantityToBuy);
        }

        // Tranzaksiya tarixiga qo'shish
        await trx('market_transactions').insert({
          buyer_id: null, // Null bo'lsa, Noma'lum Xaridor deyiladi
          seller_id: listing.seller_id,
          bot_seller_name: null,
          item_id: listing.item_id,
          quantity_sold: quantityToBuy,
          price_per_unit: currentListing.price_per_unit,
          total_price
        });
      });

      // Notification yuborish
      if (io && seller_earnings > 0) {
        io.to(`user_${listing.seller_id}`).emit('item_sold', {
          message: `Noma'lum Xaridor sizning ${quantityToBuy} ta ${listing.item_name} mahsulotingizni sotib oldi. Hisobingizga ${seller_earnings.toFixed(2)} tushdi.`,
        });
        io.emit('market_update');
      }
    }
  } catch (error) {
    console.error('Bot buyer error:', error);
  }
};

const startBotBuyer = (io) => {
  // Har 3 daqiqada ishlaydi
  setInterval(() => {
    runBotBuyer(io);
  }, 3 * 60 * 1000); 
};

module.exports = { startBotBuyer };
