'use strict';
const Joi = require('joi');

const listBatchesSchema = Joi.object({
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
  // which date field to filter: received_at or expires_at
  date_field: Joi.string().valid('received_at', 'expires_at').optional(),
});

module.exports = {
  listBatchesSchema,
};
