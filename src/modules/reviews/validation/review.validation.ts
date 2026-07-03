import * as Joi from 'joi';

const rating = Joi.number().integer().min(1).max(5).required()
  .messages({ 'number.min': 'rating must be between 1 and 5', 'number.max': 'rating must be between 1 and 5' });

const comment = Joi.string().trim().min(2).max(2000).required();

export const createReviewSchema = Joi.object({ rating, comment });

export const updateReviewSchema = Joi.object({
  rating,
  comment,
}).min(1).messages({ 'object.min': 'Provide at least one field to update' });