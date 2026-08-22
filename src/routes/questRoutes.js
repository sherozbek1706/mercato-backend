const express = require('express');
const router = express.Router();
const { isAuth } = require('../middlewares/authMiddleware');
const questController = require('../controllers/questController');

router.get('/', isAuth, questController.getUserQuests);
router.post('/complete', isAuth, questController.completePersonalQuest);
router.post('/contribute', isAuth, questController.contributeGlobalQuest);

module.exports = router;
