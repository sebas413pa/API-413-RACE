const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const {authenticateTempChange} = require('../middlewares/authTemp')

router.get('/',  employeeController.listEmployees);
router.post('/',  employeeController.createEmployee);
router.put('/:employee_id',  employeeController.updateEmployee);
router.patch('/activate/:employee_id',  employeeController.activateEmployee);
router.patch('/deactivate/:employee_id',  employeeController.deactivateEmployee);
router.post('/reset-password/:username', employeeController.resetPassword);
router.patch('/change-password', authenticateTempChange, employeeController.changePassword);
module.exports = router;