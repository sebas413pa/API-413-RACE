'use strict';
const { models } = require('../db');
const { customers: Customer, users: User, roles: Role } = models;
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const {listCustomersSchema,
    createCustomerSchema,
    updateCustomerSchema,
    customerIdParamSchema} = require('../schemas/customerSchema');
const { cursorTo } = require('readline');


const listCustomers = async (req, res) => {
    const response = new ApiResponse();
    const { error, value } = listCustomersSchema.validate(req.query);
    if (error) {
        return res.status(400).json(response.errorResponse('Parámetros inválidos', error.details));
    }
  const { role_id } = value;
  try {
    const customers = await Customer.findAll({
        where:{ status:true },
      include: [
        { model: User, as: 'user', attributes: ['username', 'email', 'status'],
          include: [{ model: Role, as: 'role', attributes: ['role_id','role_name'] }]
        },
      ],
    });
    return res.status(200).json(response.successResponse('Clientes obtenidos exitosamente', customers));
  } catch (error) {
    logger.error('Error al listar clientes', error);
    return res.status(500).json(response.errorResponse('Error al listar clientes', error));
  }
};

const createCustomer = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = createCustomerSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));

  try {
    const { username, email, password, role_id, first_name, last_name, birthday, gender, phone, address, city_id } = value;

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) return res.status(400).json(response.errorResponse('El nombre de usuario ya existe'));

    const existingMail = await User.findOne({ where: { email } });
    if (existingMail) return res.status(400).json(response.errorResponse('El correo ya existe'));

    const role = await Role.findByPk(role_id);
    if (!role) return res.status(404).json(response.errorResponse('Rol no encontrado'));

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      role_id,
      username,
      email,
      password: hashedPassword,
      status: true,
    });

    const newCustomer = await Customer.create({
      user_id: newUser.user_id,
      first_name,
      last_name,
      birthday,
      gender,
      phone,
      address,
      city_id
    });

    return res.status(201).json(
      response.successResponse(
        { customer: newCustomer},
        'Cliente y usuario creados exitosamente'
      )
    );
  } catch (error) {
    logger.error('Error al crear cliente', error);
    return res.status(500).json(response.errorResponse('Error al crear cliente', error));
  }
};

const updateCustomer = async (req, res) => {
  const response = new ApiResponse();
  const { customer_id } = req.params;

  const paramResult = customerIdParamSchema.validate(customer_id);
  if (paramResult.error)
    return res.status(400).json(response.errorResponse('ID de empleado inválido', paramResult.error.details));

  const { error, value } = updateCustomerSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));

  try {
    const customer = await Customer.findByPk(customer_id);
    if (!customer) return res.status(404).json(response.errorResponse('Cliente no encontrado'));

    const updated = await customer.update(value);
    return res.status(200).json(response.successResponse(updated, 'Cliente actualizado exitosamente'));
  } catch (error) {
    logger.error('Error al actualizar cliente', error);
    return res.status(500).json(response.errorResponse('Error al actualizar cliente', error));
  }
};

const deactivateCustomer = async (req, res) => {
  const response = new ApiResponse();
  const { customer_id } = req.params;

  try {
    const customer = await Customer.findByPk(customer_id, { include: [{ model: User, as: 'user' }] });
    if (!customer) return res.status(404).json(response.errorResponse('Cliente no encontrado'));

    customer.status = false;
    if (customer.user) customer.user.status = false;

    await customer.save();
    if (customer.user) await customer.user.save();

    return res.status(200).json(response.successResponse(null, 'Cliente desactivado exitosamente'));
  } catch (error) {
    logger.error('Error al desactivar cliente', error);
    return res.status(500).json(response.errorResponse('Error al desactivar cliente', error));
  }
};

const activateCustomer = async (req, res) => {
  const response = new ApiResponse();
  const { customer_id } = req.params;

  try {
    const customer = await Customer.findByPk(customer_id, { include: [{ model: User, as: 'user' }] });
    if (!customer) return res.status(404).json(response.errorResponse('Cliente no encontrado'));

    customer.status = true;
    if (customer.user) customer.user.status = true;

    await customer.save();
    if (customer.user) await customer.user.save();

    return res.status(200).json(response.successResponse(null, 'Cliente desactivado exitosamente'));
  } catch (error) {
    logger.error('Error al desactivar cliente', error);
    return res.status(500).json(response.errorResponse('Error al desactivar cliente', error));
  }
};


module.exports = { listCustomers, createCustomer, updateCustomer, deactivateCustomer, activateCustomer };