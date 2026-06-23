import * as Joi from 'joi';

export const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  description: Joi.string().trim().max(500).allow('', null),
  sortOrder: Joi.number().integer().min(0).default(0),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(80),
  description: Joi.string().trim().max(500).allow('', null),
  sortOrder: Joi.number().integer().min(0),
  isActive: Joi.boolean(),
})
  .min(1)
  .messages({ 'object.min': 'Provide at least one field to update' });
