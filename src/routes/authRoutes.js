const express = require('express');
const multer = require('multer');
const path = require('path');
const { register, login, getMe, setProfession, uploadProfilePicture, removeProfilePicture } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dgg8zdgec',
  api_key: process.env.CLOUDINARY_API_KEY || '689721383526374',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'iAqnLwSUwK37abVg8Nk_Ll7Vg4c'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'mercato_profiles',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
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
