import * as Joi from 'joi';

/**
 * Joi schemas for the seller endpoints.
 */
export const updateSellerSchema = Joi.object({
  businessName: Joi.string().trim().min(2).max(120),
  contactPerson: Joi.string().trim().min(2).max(80),
  mobile: Joi.string()
    .trim()
    .pattern(/^[0-9]{10,15}$/)
    .messages({ 'string.pattern.base': 'mobile must be 10-15 digits' }),
})
  .min(1) // require at least one field
  .messages({ 'object.min': 'Provide at least one field to update' });

export const rejectSellerSchema = Joi.object({
  reason: Joi.string().trim().max(300).allow('', null),
});
