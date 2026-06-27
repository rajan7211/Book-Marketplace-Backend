import * as Joi from 'joi';

const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({ 'string.pattern.base': 'must be a valid id' });

/**
 * Cross-field rule: price must be <= mrp.
 * If seller edits price above mrp (e.g. tries to "discount" negative),
 * Joi catches it before it hits the DB.
 */
export const createListingSchema = Joi.object({
  bookId: objectId,
  price: Joi.number().min(0.01).required(),
  mrp: Joi.number().min(0).required(),
  stock: Joi.number().integer().min(0).default(0),
}).custom((value, helpers) => {
  if (value.price > value.mrp) {
    return helpers.error('any.invalid');
  }
  return value;
}).messages({
  'any.invalid': 'price must be less than or equal to mrp',
});

export const updateListingSchema = Joi.object({
  price: Joi.number().min(0.01),
  mrp: Joi.number().min(0),
  stock: Joi.number().integer().min(0),
  status: Joi.string().valid('ACTIVE', 'INACTIVE'),
})
  .min(1)
  .messages({ 'object.min': 'Provide at least one field to update' })
  .custom((value, helpers) => {
    if (value.price !== undefined && value.mrp !== undefined && value.price > value.mrp) {
      return helpers.error('any.invalid');
    }
    return value;
  })
  .messages({ 'any.invalid': 'price must be less than or equal to mrp' });