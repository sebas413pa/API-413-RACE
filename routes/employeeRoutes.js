const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');


router.get('/',  employeeController.listEmployees);
router.post('/',  employeeController.createEmployee);
router.put('/:employee_id',  employeeController.updateEmployee);
router.patch('/activate/:employee_id',  employeeController.activateEmployee);
router.patch('/deactivate/:employee_id',  employeeController.deactivateEmployee);

module.exports = router;