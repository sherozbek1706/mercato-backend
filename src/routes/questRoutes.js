const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const questController = require('../controllers/questController');

router.get('/', protect, questController.getUserQuests);
router.post('/complete', protect, questController.completePersonalQuest);
router.post('/contribute', protect, questController.contributeGlobalQuest);

module.exports = router;
