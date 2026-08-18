const express = require('express');
const { sellItem, buyItem, getActiveListings, getMarketHistory, cancelListing } = require('../controllers/marketController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', protect, getActiveListings);
router.get('/history', protect, getMarketHistory);
router.post('/sell', protect, sellItem);
router.post('/buy/:id', protect, buyItem);
router.post('/cancel/:id', protect, cancelListing);

module.exports = router;
