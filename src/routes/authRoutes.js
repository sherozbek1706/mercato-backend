const express = require('express');
const { register, login, getMe, setProfession } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/set-profession', protect, setProfession);

module.exports = router;
