const db = require('../config/db');

// Add XP and level up logic
async function addXPAndCheckLevel(userId, xpToAdd, trx = db) {
  const user = await trx('users').where({ id: userId }).first();
  if (!user) return null;

  let newXp = (user.xp || 0) + xpToAdd;
  let currentLevel = user.level || 1;
  let levelChanged = false;

  while (true) {
    const nextLevel = await trx('levels').where('level', '>', currentLevel).orderBy('level', 'asc').first();
    if (nextLevel && newXp >= nextLevel.required_xp) {
      currentLevel = nextLevel.level;
      levelChanged = true;
    } else {
      break;
    }
  }

  await trx('users').where({ id: userId }).update({ xp: newXp, level: currentLevel });
  
  return { newXp, currentLevel, levelChanged };
}

exports.getUserQuests = async (req, res) => {
  try {
    const userId = req.user.id;
    // 1. Shaxsiy (Shoh Farmoni)
    // Find highest completed order_index
    const completedQuests = await db('user_quests')
      .where({ user_id: userId })
      .join('quests', 'user_quests.quest_id', 'quests.id')
      .select('quests.order_index');
      
    let maxCompletedIndex = 0;
    completedQuests.forEach(cq => {
      if (cq.order_index > maxCompletedIndex) maxCompletedIndex = cq.order_index;
    });
    
    // The active quest is the one with order_index immediately after maxCompletedIndex
    const activePersonalQuest = await db('quests')
      .where('order_index', '>', maxCompletedIndex)
      .where({ is_active: true })
      .orderBy('order_index', 'asc')
      .first();

    if (activePersonalQuest && typeof activePersonalQuest.required_items === 'string') {
        activePersonalQuest.required_items = JSON.parse(activePersonalQuest.required_items);
    }

    // 2. Ommaviy (Qirollik Loyihasi)
    const activeGlobalQuests = await db('global_quests')
      .where({ is_active: true })
      .orderBy('id', 'desc');
      
    for (let gq of activeGlobalQuests) {
      if (typeof gq.required_items === 'string') gq.required_items = JSON.parse(gq.required_items);
      
      for (let req of gq.required_items) {
        const sum = await db('global_quest_contributions')
          .where({ global_quest_id: gq.id, item_id: req.item_id })
          .sum('qty as total_qty');
        req.current_qty = parseInt(sum[0].total_qty) || 0;
        
        const userSum = await db('global_quest_contributions')
          .where({ global_quest_id: gq.id, item_id: req.item_id, user_id: userId })
          .sum('qty as user_qty');
        req.user_contribution = parseInt(userSum[0].user_qty) || 0;
      }
    }

    res.json({
      personal: activePersonalQuest || null,
      global: activeGlobalQuests
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
};

exports.completePersonalQuest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { quest_id } = req.body;
    
    const quest = await db('quests').where({ id: quest_id }).first();
    if (!quest) return res.status(404).json({ message: 'Quest topilmadi' });
    
    const alreadyCompleted = await db('user_quests').where({ user_id: userId, quest_id }).first();
    if (alreadyCompleted) return res.status(400).json({ message: 'Bu questni oldin bajargansiz' });
    
    const requiredItems = typeof quest.required_items === 'string' ? JSON.parse(quest.required_items) : quest.required_items;
    
    // Check inventory
    await db.transaction(async trx => {
      for (const reqItem of requiredItems) {
        const inv = await trx('inventory').where({ user_id: userId, item_id: reqItem.item_id }).first();
        if (!inv || inv.quantity < reqItem.qty) {
          throw new Error('Sizda yetarli xomashyo yo\'q');
        }
      }
      
      // Deduct items
      for (const reqItem of requiredItems) {
        await trx('inventory')
          .where({ user_id: userId, item_id: reqItem.item_id })
          .decrement('quantity', reqItem.qty);
      }
      
      // Clean up empty slots
      await trx('inventory').where({ user_id: userId }).andWhere('quantity', '<=', 0).del();
      
      // Add rewards
      const user = await trx('users').where({ id: userId }).first();
      await trx('users')
        .where({ id: userId })
        .update({ balance: parseFloat(user.balance) + quest.reward_coins });
        
      // Record completion
      await trx('user_quests').insert({ user_id: userId, quest_id });
    });

    const levelData = await addXPAndCheckLevel(userId, quest.reward_xp);

    res.json({ message: 'Tabriklaymiz, Shoh Farmoni muvaffaqiyatli bajarildi!', levelData });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.contributeGlobalQuest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { global_quest_id, item_id, qty } = req.body;
    
    if (!qty || qty <= 0) return res.status(400).json({ message: 'Noto\'g\'ri miqdor' });

    const result = await db.transaction(async trx => {
      const gq = await trx('global_quests').where({ id: global_quest_id }).first();
      if (!gq || !gq.is_active) throw new Error('Bu loyiha faol emas');
      
      // Parse items to find specific target ratio
      const parsedItems = typeof gq.required_items === 'string' ? JSON.parse(gq.required_items) : gq.required_items;
      const targetItem = parsedItems.find(i => parseInt(i.item_id) === parseInt(item_id));
      if (!targetItem) throw new Error('Bu mahsulot ushbu loyihaga kerak emas');
      
      // Check limits
      const sum = await trx('global_quest_contributions').where({ global_quest_id, item_id }).sum('qty as total_qty');
      const currentQty = parseInt(sum[0].total_qty) || 0;
      if (currentQty + qty > targetItem.target_qty) {
        throw new Error(`Siz buncha qo'sha olmaysiz. Yana faqat ${targetItem.target_qty - currentQty} ta kerak xolos!`);
      }
      
      const inv = await trx('inventory').where({ user_id: userId, item_id }).first();
      if (!inv || inv.quantity < qty) throw new Error('Sizda yetarli mahsulot yo\'q');
      
      await trx('inventory').where({ id: inv.id }).decrement('quantity', qty);
      await trx('inventory').where({ user_id: userId }).andWhere('quantity', '<=', 0).del();
      
      await trx('global_quest_contributions').insert({
        global_quest_id, user_id: userId, item_id, qty
      });
      
      // Reward logic based on pool and total items
      let totalTarget = 0;
      parsedItems.forEach(r => { totalTarget += parseInt(r.target_qty); });
      
      const coinPerItem = gq.reward_coins_pool / totalTarget;
      const xpPerItem = gq.reward_xp_pool / totalTarget;
      
      const rewardCoins = qty * coinPerItem;
      const rewardXp = qty * xpPerItem;
      
      const user = await trx('users').where({ id: userId }).first();
      await trx('users').where({ id: userId }).update({ balance: parseFloat(user.balance) + rewardCoins });
      await addXPAndCheckLevel(userId, rewardXp, trx);

      return { rewardCoins, rewardXp }; // Return variables from trx
    });

    res.json({ 
      message: 'Loyihaga o\'z hissangizni qo\'shdingiz! Barakalla!',
      earnedCoins: result.rewardCoins,
      earnedXp: result.rewardXp
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
