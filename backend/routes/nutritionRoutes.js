const express = require('express');
const controller = require('../controllers/nutritionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/', controller.list);
router.put('/', controller.upsert);
router.post('/meal', controller.addMeal);
router.post('/water', controller.water);

module.exports = router;
