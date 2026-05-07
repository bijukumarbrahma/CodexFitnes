const express = require('express');
const controller = require('../controllers/stepController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/', controller.list);
router.get('/today', controller.today);
router.post('/', controller.upsert);

module.exports = router;
