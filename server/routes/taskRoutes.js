const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

// Update task status (ONGOING, DONE, etc.)
router.patch('/:taskId/status', taskController.updateTaskStatus);

// Get task by ID
router.get('/:taskId', taskController.getTaskById);

module.exports = router;
