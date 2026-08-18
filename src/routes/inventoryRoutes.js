const express = require('express');
const { getInventory } = require('../controllers/inventoryController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', protect, getInventory);

module.exports = router;
