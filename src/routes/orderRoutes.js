const express = require('express');
const router = express.Router();
const { getOrders, fulfillOrder } = require('../controllers/ordersController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, getOrders);
router.post('/:id/fulfill', protect, fulfillOrder);

module.exports = router;
