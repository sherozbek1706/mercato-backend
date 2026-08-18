const db = require('../config/db');

const doWork = async (req, res) => {
  const user_id = req.user.id;

  try {
    await db.transaction(async (trx) => {
      // 1. Get user profession and energy
      const user = await trx('users').where({ id: user_id }).forUpdate().first();
      const profession = await trx('professions').where({ id: user.profession_id }).first();
      
      if (!profession) {
        throw new Error("Sizning kasbingiz topilmadi");
      }

      let consume = [];
      let produce = [];
      try {
        consume = typeof profession.consume === 'string' ? JSON.parse(profession.consume) : (profession.consume || []);
        produce = typeof profession.produce === 'string' ? JSON.parse(profession.produce) : (profession.produce || []);
      } catch (e) {
        console.error("Retsept parse xatosi:", e);
      }

      const energy_cost = profession.energy_cost;

      if (user.energy < energy_cost) {
        throw new Error(`Sizda yetarli energiya yo'q. Kerak: ${energy_cost}, Sizda bor: ${user.energy}`);
      }

      // 2. Check if user has necessary tools or resources to consume
      for (let reqItem of consume) {
        const inv = await trx('inventory').where({ user_id, item_id: reqItem.item_id }).first();
        if (!inv || inv.quantity < reqItem.qty) {
          throw new Error("Ishlab chiqarish uchun xom-ashyo yetarli emas!");
        }
      }

      // 3. Deduct energy
      await trx('users').where({ id: user_id }).decrement('energy', energy_cost);

      // 4. Deduct consumed items
      for (let reqItem of consume) {
        await trx('inventory')
          .where({ user_id, item_id: reqItem.item_id })
          .decrement('quantity', reqItem.qty);
      }

      // 5. Add produced items
      for (let prodItem of produce) {
        const inv = await trx('inventory').where({ user_id, item_id: prodItem.item_id }).first();
        if (inv) {
          await trx('inventory')
            .where({ user_id, item_id: prodItem.item_id })
            .increment('quantity', prodItem.qty);
        } else {
          await trx('inventory').insert({
            user_id,
            item_id: prodItem.item_id,
            quantity: prodItem.qty
          });
        }
      }
    });

    res.json({ message: "Siz muvaffaqiyatli ishladingiz va mahsulot ishlab chiqardingiz!" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || 'Server xatosi' });
  }
};

const eatFood = async (req, res) => {
  const user_id = req.user.id;
  
  try {
    await db.transaction(async (trx) => {
      const user = await trx('users').where({ id: user_id }).forUpdate().first();
      
      if (user.energy >= user.max_energy) {
        throw new Error("Sizning energiyangiz to'la!");
      }

      // Non qidiramiz (id: 4)
      const breadInv = await trx('inventory').where({ user_id, item_id: 4 }).first();
      
      if (!breadInv || breadInv.quantity <= 0) {
        throw new Error("Sizda non yo'q! Bozordan sotib oling.");
      }

      // 1 non = 50 energiya
      await trx('inventory').where({ user_id, item_id: 4 }).decrement('quantity', 1);
      
      let newEnergy = user.energy + 50;
      if (newEnergy > user.max_energy) newEnergy = user.max_energy;

      await trx('users').where({ id: user_id }).update({ energy: newEnergy });
    });

    res.json({ message: "Non yedingiz, energiyangiz tiklandi!" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || 'Server xatosi' });
  }
}

module.exports = { doWork, eatFood };
