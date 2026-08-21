const express = require('express');
const multer = require('multer');
const path = require('path');
const { register, login, getMe, setProfession, uploadProfilePicture, removeProfilePicture } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/set-profession', protect, setProfession);
router.post('/profile-picture', protect, upload.single('profile_picture'), uploadProfilePicture);
router.delete('/profile-picture', protect, removeProfilePicture);

module.exports = router;
