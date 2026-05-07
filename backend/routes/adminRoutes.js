const express = require('express');
const controller = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.use(protect, adminOnly);
router.get('/overview', controller.overview);
router.get('/users', controller.users);
router.delete('/users/:id', controller.deleteUser);
router.delete('/photos/:id', controller.deletePhoto);

module.exports = router;
