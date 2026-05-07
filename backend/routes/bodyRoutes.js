const express = require('express');
const controller = require('../controllers/bodyController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/', controller.list);
router.put('/', controller.upsert);

module.exports = router;
