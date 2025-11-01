'use strict';

const {models} = require('../db');
const {sequelize} = require('../db')
const {sales: Sale, sale_details: SaleDetail} = models;
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

