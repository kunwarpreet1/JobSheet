const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

router.post('/register', deviceController.registerDevice);
router.post('/deactivate', deviceController.deactivateDevice);
router.get('/pending-pushes/:userId', deviceController.getPendingPushes);

module.exports = router;
