'use strict';
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const config = require('../config/config');
const { sequelize, models } = require('../db');
const { customers: Customer, users: User, roles: Role, promo_codes: PromoCode, cities:City, reset_tokens: ResetToken } = models;
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const {listCustomersSchema,
    createCustomerSchema,
    updateCustomerSchema,
    customerIdParamSchema} = require('../schemas/customerSchema');
const { resetPasswordSchema } = require("../schemas/recoverSchema");
const {createWelcomePromoCode} = require('../services/customerService')

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
        include: [
        { 
          model: City, as: 'city', attributes: ['city_id', 'city_name'],
        },
      ],
    });
    return res.status(200).json(response.successResponse('Clientes obtenidos exitosamente', customers));
  } catch (error) {
    logger.error('Error al listar clientes', error);
    return res.status(500).json(response.errorResponse('Error al listar clientes', error));
  }
};
const listCities = async(req,res) =>{
    const response = new ApiResponse(); 
  try {
    const cities = await City.findAll({
      where:{
        status: true
      }
    });
    return res.status(200).json(response.successResponse('Ciudades obtenidos exitosamente', cities));
  } catch (error) {
    logger.error('Error al listar Ciudades', error);
    return res.status(500).json(response.errorResponse('Error al listar Ciudades', error));
  }
};

const createCustomer = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = createCustomerSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));

  try {
    const { username, email, password, role_id, first_name, last_name, birthday, gender, phone, address, city_id } = value;

    const transaction = await sequelize.transaction();

    try {
      const existingUser = await User.findOne({ where: { username }, transaction });
      if (existingUser) {
        await transaction.rollback();
        return res.status(400).json(response.errorResponse('El nombre de usuario ya existe'));
      }

      const existingMail = await User.findOne({ where: { email }, transaction });
      if (existingMail) {
        await transaction.rollback();
        return res.status(400).json(response.errorResponse('El correo ya existe'));
      }

      const role = await Role.findByPk(role_id, { transaction });
      if (!role) {
        await transaction.rollback();
        return res.status(404).json(response.errorResponse('Rol no encontrado'));
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const newUser = await User.create({
        role_id,
        username,
        email,
        password: hashedPassword,
        status: true,
      }, { transaction });

      const newCustomer = await Customer.create({
        user_id: newUser.user_id,
        first_name,
        last_name,
        birthday,
        gender,
        phone,
        address,
        city_id
      }, { transaction });

      const welcomePromo = await createWelcomePromoCode(newCustomer.customer_id, transaction);

      await transaction.commit();

      const customerData = newCustomer.toJSON ? newCustomer.toJSON() : newCustomer;
      const promoData = welcomePromo.toJSON ? welcomePromo.toJSON() : welcomePromo;

      return res.status(201).json(
        response.successResponse(
          {
            customer: customerData,
            promo_code: {
              promo_code_id: promoData.promo_code_id,
              promo_code: promoData.promo_code,
              discount_type: promoData.discount_type,
              discount_value: Number(promoData.discount_value),
              start_date: promoData.start_date,
              end_date: promoData.end_date,
              status: promoData.status,
            },
          },
          'Cliente, usuario y código promocional creados exitosamente'
        )
      );
    } catch (err) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      throw err;
    }
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

    const user = await User.findByPk(customer.user_id);
    if (!user) return res.status(404).json(response.errorResponse('Usuario asociado no encontrado'));

    if (value.email && value.email !== user.email) {
      const emailExists = await User.findOne({ where: { email: value.email } });

      if (emailExists && emailExists.user_id !== user.user_id) {
        return res.status(400).json(response.errorResponse('El email ya está en uso por otro usuario'));
      }

      await user.update({ email: value.email });
    }

    delete value.email;

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

const forgotPassword = async(req,res)=>{
   try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await ResetToken.create({ user_id: user.user_id, token, expires_at: expiresAt });

    // Configurar transporte de correo
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.mail.mailUser,
        pass: config.mail.mailPass
      }
    });

    const resetUrl = `${config.cors.origin}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: `"Soporte 413-RACE" <${config.mail.mailUser}>`,
      to: user.email,
      subject: 'Recuperación de contraseña',
      html: `
        <h2>Solicitud de recuperación de contraseña</h2>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
        <a href="${resetUrl}" target="_blank">${resetUrl}</a>
        <p>Este enlace expira en 1 hora.</p>
      `
    });

    res.json({ message: 'Correo de recuperación enviado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al solicitar recuperación' });
  }
};


const resetPassword = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = resetPasswordSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res
      .status(400)
      .json(response.errorResponse('Datos inválidos', error.details));
  }

  try {
    const { token, newPassword } = value;

    const resetToken = await ResetToken.findOne({ where: { token, used: false } });
    if (!resetToken)
      return res
        .status(400)
        .json(response.errorResponse('Token inválido o ya utilizado'));

    if (new Date() > resetToken.expires_at)
      return res.status(400).json(response.errorResponse('Token expirado'));

    const user = await User.findByPk(resetToken.user_id);
    if (!user)
      return res.status(404).json(response.errorResponse('Usuario no encontrado'));

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await user.update({ password: hashedPassword });
    await resetToken.update({ used: true });

    return res
      .status(200)
      .json(response.successResponse('Contraseña restablecida correctamente'));
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    return res
      .status(500)
      .json(response.errorResponse('Error al restablecer contraseña', error));
  }
};


module.exports = { listCustomers, createCustomer, updateCustomer, deactivateCustomer, activateCustomer, listCities, forgotPassword, resetPassword};