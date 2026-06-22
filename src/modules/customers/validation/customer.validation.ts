import * as Joi from 'joi';

export const updateCustomerSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50),
  lastName: Joi.string().trim().min(1).max(50),
  phone: Joi.string()
    .trim()
    .pattern(/^[0-9]{10,15}$/)
    .messages({ 'string.pattern.base': 'phone must be 10-15 digits' }),
})
  .min(1) // at least one field must be supplied
  .messages({ 'object.min': 'Provide at least one field to update' });
