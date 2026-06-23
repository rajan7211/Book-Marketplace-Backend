import * as Joi from 'joi';

// A Mongo ObjectId is a 24-character hex string.
const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({ 'string.pattern.base': 'must be a valid id' });

export const addCartItemSchema = Joi.object({
  listingId: objectId,
  quantity: Joi.number().integer().min(1).max(100).default(1),
});

export const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).max(100).required(),
});
