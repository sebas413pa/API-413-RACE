'use strict';
const { models, sequelize } = require('../db');
const { employees: Employee, users: User, roles: Role } = models;
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const { listEmployeeSchema,createEmployeeSchema, updateEmployeeSchema, employeeIdParamSchema, usernameParamSchema, changeOwnPasswordSchema } = require('../schemas/employeeSchema');
const { default: api } = require('../utils/apiClient');

function generateStrongPassword() {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const specials = "!@#$%^&*()_+{}[]|:;<>,.?/~`-=";

  const allChars = uppercase + lowercase + numbers + specials;

  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specials[Math.floor(Math.random() * specials.length)];

  const remainingLength = Math.floor(Math.random() * 5) + 4; 
  for (let i = 0; i < remainingLength; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
}

const changePassword = async (req, res) => {
  const response = new ApiResponse();
  const userId = req.user?.user_id; 
  if (!userId) return res.status(401).json(response.errorResponse("No autorizado"));

  const { error, value } = changeOwnPasswordSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse("Datos de body inválidos", error.details));

  const { newPassword } = value;

  try {
    const user = await User.findByPk(userId); 
    if (!user) return res.status(404).json(response.errorResponse("Usuario no encontrado"));

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await user.update({ password: hashedPassword, mustChangePassword: false });

     res.clearCookie('tempToken', { path: '/' });
    return res.status(200).json(response.successResponse(null,"Password actualizada correctamente"));
  } catch (error) {
    logger.error("Error al cambiar Password", error);
    return res.status(500).json(response.errorResponse("Error al cambiar Password", error));
  }
};

const resetPassword = async (req,res) => {
    const response = new ApiResponse();
    const { error, value } = usernameParamSchema.validate(req.params.username);
    if (error) return res.status(400).json(response.errorResponse("Usuario inválido", error.details));
    const username = value;
    
    try{
        const userExists = await User.findOne({
            where:{ username }
        });
        if (!userExists) {
        logger.warn(`Usuario no encontrado: ${username}`);
        return res.status(404).json(response.errorResponse("Usuario no encontrado"));
        }
        const tempPassword = generateStrongPassword();
        const hashedPassword = await bcrypt.hash(tempPassword,12);

        await userExists.update({
            password: hashedPassword,
            mustChangePassword: true
        });
          return res.status(200).json(response.successResponse(tempPassword,"Contraseña temporal asignada"));
    }catch(error){
        logger.error("Error al actualizar la password", error);
        return res.status(500).json(response.errorResponse("Error al actualizar la password", error));
    }
};


const listEmployees = async (req, res) => {
    const response = new ApiResponse();
    const { error, value } = listEmployeeSchema.validate(req.query);
    if (error) {
        return res.status(400).json(response.errorResponse('Parámetros inválidos', error.details));
    }
  const { role_id } = value;
  try {
    const employees = await Employee.findAll({
        where:{ status:true },
      include: [
        { model: User, as: 'user', attributes: ['username', 'email', 'status'],
          include: [{ model: Role, as: 'role', attributes: ['role_id','role_name'] }]
        },
      ],
    });
    return res.status(200).json(response.successResponse('Empleados obtenidos exitosamente', employees));
  } catch (error) {
    logger.error('Error al listar empleados', error);
    return res.status(500).json(response.errorResponse('Error al listar empleados', error));
  }
};

const createEmployee = async (req, res) => {
  const accessToken = req.cookies?.accessToken;
const refreshToken = req.cookies?.refreshToken;

  const response = new ApiResponse();
  const { error, value } = createEmployeeSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));
  const transaction = await sequelize.transaction();
  try {
    const { username, email, role_id, first_name, last_name, hire_date, salary } = value;

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) return res.status(400).json(response.errorResponse('El nombre de usuario ya existe'));

    const existingMail = await User.findOne({ where: { email } });
    if (existingMail) return res.status(400).json(response.errorResponse('El correo ya existe'));

    const role = await Role.findByPk(role_id);
    if (!role) return res.status(404).json(response.errorResponse('Rol no encontrado'));

    const tempPassword = generateStrongPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const newUser = await User.create({
      role_id,
      username,
      email,
      password: hashedPassword,
      status: true,
      mustChangePassword: 1
    }, {transaction});

    const newEmployee = await Employee.create({
      user_id: newUser.user_id,
      first_name,
      last_name,
      hire_date,
      salary,
    }, {transaction});
     try {
      const apiPayload = {
        users_id: newUser.user_id,
        name: newEmployee.first_name,
        last_name: newEmployee.last_name,
        username: newUser.username,
        email: newUser.email,
        role_id: newUser.role_id,
        status: 1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
      };

      const crmResp = await api.post('/users', apiPayload, {cookies: {
    accessToken,
    refreshToken
  }});
    if (crmResp && crmResp.data && crmResp.data.success === false) {
        await transaction.rollback();                     
        return res.status(400).json(response.errorResponse('No se pudo sincronizar con el CRM', crmResp.data));
      }
      await transaction.commit()
    } catch (crmErr) {
      try { if (!transaction.finished) await transaction.rollback(); } catch (rbErr) { logger.error('Rollback failed', rbErr); }
      const status = crmErr.response?.status ?? 502;
      const body = crmErr.response?.data ?? crmErr.message ?? String(crmErr);
      logger.warn('CRM error creating guest customer', { err: crmErr.message || crmErr, body });
      return res.status(status).json(response.errorResponse('No se pudo sincronizar con el CRM', body));
    }

    return res.status(201).json(
      response.successResponse(
        { employee: newEmployee, tempPassword },
        'Empleado y usuario creados exitosamente'
      )
    );
  } catch (error) {
    logger.error('Error al crear empleado', error);
    return res.status(500).json(response.errorResponse('Error al crear empleado', error));
  }
};

const updateEmployee = async (req, res) => {
  const response = new ApiResponse();
  const { employee_id } = req.params;

  const paramResult = employeeIdParamSchema.validate(employee_id);
  if (paramResult.error)
    return res.status(400).json(response.errorResponse('ID de empleado inválido', paramResult.error.details));

  const { error, value } = updateEmployeeSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));

  try {
    const employee = await Employee.findByPk(employee_id);
    if (!employee) return res.status(404).json(response.errorResponse('Empleado no encontrado'));

    const updated = await employee.update(value);
    return res.status(200).json(response.successResponse(updated, 'Empleado actualizado exitosamente'));
  } catch (error) {
    logger.error('Error al actualizar empleado', error);
    return res.status(500).json(response.errorResponse('Error al actualizar empleado', error));
  }
};

const deactivateEmployee = async (req, res) => {
  const response = new ApiResponse();
  const { employee_id } = req.params;

  try {
    const employee = await Employee.findByPk(employee_id, { include: [{ model: User, as: 'user' }] });
    if (!employee) return res.status(404).json(response.errorResponse('Empleado no encontrado'));

    employee.status = false;
    if (employee.user) employee.user.status = false;

    await employee.save();
    if (employee.user) await employee.user.save();

    return res.status(200).json(response.successResponse(null, 'Empleado desactivado exitosamente'));
  } catch (error) {
    logger.error('Error al desactivar empleado', error);
    return res.status(500).json(response.errorResponse('Error al desactivar empleado', error));
  }
};

const activateEmployee = async (req, res) => {
  const response = new ApiResponse();
  const { employee_id } = req.params;

  try {
    const employee = await Employee.findByPk(employee_id, { include: [{ model: User, as: 'user' }] });
    if (!employee) return res.status(404).json(response.errorResponse('Empleado no encontrado'));

    employee.status = true;
    if (employee.user) employee.user.status = true;

    await employee.save();
    if (employee.user) await employee.user.save();

    return res.status(200).json(response.successResponse(null, 'Empleado desactivado exitosamente'));
  } catch (error) {
    logger.error('Error al desactivar empleado', error);
    return res.status(500).json(response.errorResponse('Error al desactivar empleado', error));
  }
};


module.exports = { listEmployees, createEmployee, updateEmployee, deactivateEmployee, activateEmployee, resetPassword, changePassword };