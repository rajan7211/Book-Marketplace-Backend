import * as Joi from 'joi';

export const createBookSchema = Joi.object({
  // ISBN-10 or ISBN-13 (digits, optional trailing X for ISBN-10)
  isbn: Joi.string()
    .trim()
    .pattern(/^(?:\d{9}[\dXx]|\d{13})$/)
    .required()
    .messages({ 'string.pattern.base': 'isbn must be a valid 10- or 13-digit ISBN' }),
  title: Joi.string().trim().min(1).max(300).required(),
  author: Joi.string().trim().min(1).max(200).required(),
  publisher: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().min(1).max(5000).required(),
  category: Joi.string().trim().min(1).max(100).required(),
  tags: Joi.array().items(Joi.string().trim().max(40)).max(20).default([]),
});

export const bookQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().allow('').max(200),
  category: Joi.string().trim().max(100),
  tag: Joi.string().trim().max(40),
  sort: Joi.string()
    .valid('newest', 'title-asc', 'title-desc', 'price-asc', 'price-desc')
    .default('newest'),
});

export const rejectBookSchema = Joi.object({
  reason: Joi.string().trim().max(300).allow('', null),
});
