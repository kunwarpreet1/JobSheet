const express = require('express');
const router = express.Router();
const jobSheetController = require('../controllers/jobSheetController');

// List all job sheets
router.get('/', jobSheetController.getAllJobSheets);

// Clear all job sheets
router.delete('/', jobSheetController.clearAllJobSheets);

// Get single job sheet by ID
router.get('/:id', jobSheetController.getJobSheetById);

// Create new job sheet
router.post('/', jobSheetController.createJobSheet);

// Update entire job sheet
router.put('/:id', jobSheetController.updateJobSheet);

// Update specific stage
router.patch('/:id/stages/:stageId', jobSheetController.updateStageStatus);

// Delete specific stage (Owner only, Not Started status)
router.delete('/:id/stages/:stageId', jobSheetController.deleteStage);

// Remove all assigned stages from job sheet (Owner only)
router.delete('/:id/stages', jobSheetController.removeAllStages);

// Delete single job sheet
router.delete('/:id', jobSheetController.deleteJobSheet);

module.exports = router;
