import * as Joi from 'joi';

export const createOrderSchema = Joi.object({
  shippingAddress: Joi.string().trim().min(5).max(500).required(),
});
