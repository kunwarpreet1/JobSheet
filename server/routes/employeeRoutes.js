const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

router.get('/', employeeController.getAllEmployees);
router.post('/', employeeController.createEmployee);
router.get('/:employeeId', employeeController.getEmployeeById);
router.put('/:employeeId', employeeController.updateEmployee);
router.patch('/:employeeId/availability', employeeController.toggleAvailability);
router.delete('/:employeeId', employeeController.deleteEmployee);

module.exports = router;
