const db = require('../config/db');

// Barcha (yoki faol) davlat buyurtmalarini olish
const getOrders = async (req, res) => {
  try {
    const orders = await db('state_orders')
      .where({ is_active: true })
      .join('items', 'state_orders.item_id', 'items.id')
      .select(
        'state_orders.*',
        'items.name as item_name',
        'items.icon as item_icon'
      )
      .orderBy('state_orders.created_at', 'desc');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

// Foydalanuvchi buyurtmani qondirishi (sotishi)
const fulfillOrder = async (req, res) => {
  const orderId = req.params.id;
  const { quantity } = req.body;
  const user_id = req.user.id;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ message: "Noto'g'ri miqdor" });
  }

  try {
    let responseMessage = "";
    
    await db.transaction(async (trx) => {
      // 1. Orderni qulflash
      const order = await trx('state_orders').where({ id: orderId, is_active: true }).forUpdate().first();
      if (!order) throw new Error("Bu buyurtma yakunlangan yoki mavjud emas");

      const remainingNeeded = order.quantity_required - order.quantity_fulfilled;
      if (remainingNeeded <= 0) throw new Error("Bu buyurtma allaqachon to'liq bajarilgan");

      const actualQty = Math.min(quantity, remainingNeeded);

      // 2. Foydalanuvchi inventarini tekshirish
      const inv = await trx('inventory').where({ user_id, item_id: order.item_id }).forUpdate().first();
      if (!inv || inv.quantity < actualQty) {
        throw new Error("Sizda yetarli mahsulot yo'q");
      }

      // 3. Inventardan yechish
      if (inv.quantity === actualQty) {
        await trx('inventory').where({ id: inv.id }).del();
      } else {
        await trx('inventory').where({ id: inv.id }).decrement('quantity', actualQty);
      }

      // 4. Foydalanuvchiga pul qo'shish (Soliqsiz! Davlat buyurtmasi soliqqa tortilmaydi)
      const reward = Number(order.reward_per_unit) * actualQty;
      await trx('users').where({ id: user_id }).increment('balance', reward);

      // 5. Order progressini yangilash
      const newFulfilled = order.quantity_fulfilled + actualQty;
      const isComplete = newFulfilled >= order.quantity_required;

      await trx('state_orders').where({ id: orderId }).update({
        quantity_fulfilled: newFulfilled,
        is_active: !isComplete
      });

      responseMessage = `Siz davlatga ${actualQty} ta mahsulot topshirdingiz va ${reward} Tanga ishladingiz!`;
    });

    // Socket orqali boshqalarga xabar
    const io = req.app.get('io');
    if (io) {
      io.emit('orders_update');
    }

    res.json({ message: responseMessage });
  } catch (error) {
    res.status(400).json({ message: error.message || "Xatolik" });
  }
};

module.exports = {
  getOrders,
  fulfillOrder
};
