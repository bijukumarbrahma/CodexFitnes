const express = require('express');
const controller = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', protect, controller.dashboard);
router.put('/profile', protect, controller.updateProfile);

module.exports = router;
