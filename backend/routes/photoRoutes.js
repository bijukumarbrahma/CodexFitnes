const express = require('express');
const controller = require('../controllers/photoController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect);
router.get('/', controller.list);
router.post('/', upload.single('photo'), controller.upload);
router.delete('/:id', controller.remove);

module.exports = router;
