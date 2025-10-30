'use strict';
const { models } = require('../db');
const { suppliers: Supplier } = models;
const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const {
  listSuppliersSchema,
  createSupplierSchema,
  updateSupplierSchema,
  supplierIdParamSchema,
} = require('../schemas/supplierSchema');

const listSuppliers = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = listSuppliersSchema.validate(req.query);
  if (error) return res.status(400).json(response.errorResponse('Parámetros inválidos', error.details));

  const { status, supplier_name } = value;

  try {
    const where = {};
    if (typeof status !== 'undefined') where.status = status;
    if (supplier_name) where.supplier_name = { [require('sequelize').Op.like]: `%${supplier_name}%` };

    const suppliers = await Supplier.findAll({ where });
    return res.status(200).json(response.successResponse(suppliers, 'Proveedores obtenidos exitosamente'));
  } catch (err) {
    logger.error('Error al listar proveedores', err);
    return res.status(500).json(response.errorResponse('Error al listar proveedores', err));
  }
};

const createSupplier = async (req, res) => {
  const response = new ApiResponse();
  const { error, value } = createSupplierSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));

  try {
    const newSupplier = await Supplier.create(value);
    return res.status(201).json(response.successResponse(newSupplier, 'Proveedor creado exitosamente'));
  } catch (err) {
    logger.error('Error al crear proveedor', err);
    return res.status(500).json(response.errorResponse('Error al crear proveedor', err));
  }
};

const updateSupplier = async (req, res) => {
  const response = new ApiResponse();
  const { supplier_id } = req.params;

  const paramResult = supplierIdParamSchema.validate(supplier_id);
  if (paramResult.error)
    return res.status(400).json(response.errorResponse('ID de proveedor inválido', paramResult.error.details));

  const { error, value } = updateSupplierSchema.validate(req.body);
  if (error) return res.status(400).json(response.errorResponse('Datos inválidos', error.details));

  try {
    const supplier = await Supplier.findByPk(supplier_id);
    if (!supplier) return res.status(404).json(response.errorResponse('Proveedor no encontrado'));

    const updated = await supplier.update(value);
    return res.status(200).json(response.successResponse(updated, 'Proveedor actualizado exitosamente'));
  } catch (err) {
    logger.error('Error al actualizar proveedor', err);
    return res.status(500).json(response.errorResponse('Error al actualizar proveedor', err));
  }
};

const deactivateSupplier = async (req, res) => {
  const response = new ApiResponse();
  const { supplier_id } = req.params;

  try {
    const supplier = await Supplier.findByPk(supplier_id);
    if (!supplier) return res.status(404).json(response.errorResponse('Proveedor no encontrado'));

    supplier.status = false;
    await supplier.save();

    return res.status(200).json(response.successResponse(null, 'Proveedor desactivado exitosamente'));
  } catch (err) {
    logger.error('Error al desactivar proveedor', err);
    return res.status(500).json(response.errorResponse('Error al desactivar proveedor', err));
  }
};

const activateSupplier = async (req, res) => {
  const response = new ApiResponse();
  const { supplier_id } = req.params;

  try {
    const supplier = await Supplier.findByPk(supplier_id);
    if (!supplier) return res.status(404).json(response.errorResponse('Proveedor no encontrado'));

    supplier.status = true;
    await supplier.save();

    return res.status(200).json(response.successResponse(null, 'Proveedor activado exitosamente'));
  } catch (err) {
    logger.error('Error al activar proveedor', err);
    return res.status(500).json(response.errorResponse('Error al activar proveedor', err));
  }
};

module.exports = {
  listSuppliers,
  createSupplier,
  updateSupplier,
  deactivateSupplier,
  activateSupplier,
};
