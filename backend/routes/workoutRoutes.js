const express = require('express');
const controller = require('../controllers/workoutController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/exercises', controller.exercises);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
