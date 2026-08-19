const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middlewares/authMiddleware');
const {
  login,
  getUsers,
  getProfessions,
  createOrUpdateProfession,
  getItems,
  createOrUpdateItem,
  deleteUser,
  deleteProfession,
  deleteItem,
  getUserDetails
} = require('../controllers/adminController');

router.post('/login', login);

router.get('/users', isAdmin, getUsers);
router.get('/users/:id', isAdmin, getUserDetails);
router.delete('/users/:id', isAdmin, deleteUser);

router.get('/professions', isAdmin, getProfessions);
router.post('/professions', isAdmin, createOrUpdateProfession);
router.delete('/professions/:id', isAdmin, deleteProfession);

router.get('/items', isAdmin, getItems);
router.post('/items', isAdmin, createOrUpdateItem);
router.delete('/items/:id', isAdmin, deleteItem);

router.get('/settings', isAdmin, require('../controllers/adminController').getSettings);
router.post('/settings', isAdmin, require('../controllers/adminController').updateSettings);

router.get('/bots', isAdmin, require('../controllers/adminController').getBots);
router.post('/bots', isAdmin, require('../controllers/adminController').createOrUpdateBot);
router.delete('/bots/:id', isAdmin, require('../controllers/adminController').deleteBot);

router.get('/orders', isAdmin, require('../controllers/adminController').getAdminOrders);
router.post('/orders', isAdmin, require('../controllers/adminController').createOrUpdateAdminOrder);
router.delete('/orders/:id', isAdmin, require('../controllers/adminController').deleteAdminOrder);

router.get('/stats/market', isAdmin, require('../controllers/adminController').getMarketStats);

module.exports = router;
