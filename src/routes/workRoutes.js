const express = require('express');
const { doWork, eatFood } = require('../controllers/workController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', protect, doWork);
router.post('/eat', protect, eatFood);

module.exports = router;
