import * as Joi from 'joi';

const email = Joi.string().email().lowercase().trim().required();
const password = Joi.string().min(6).max(72).required(); // bcrypt max 72 bytes

export const registerCustomerSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50).required(),
  lastName: Joi.string().trim().min(1).max(50).required(),
  email,
  password,
});

export const registerSellerSchema = Joi.object({
  businessName: Joi.string().trim().min(2).max(120).required(),
  contactPerson: Joi.string().trim().min(2).max(80).required(),
  email,
  mobile: Joi.string()
    .trim()
    .pattern(/^[0-9]{10,15}$/)
    .required()
    .messages({ 'string.pattern.base': 'mobile must be 10-15 digits' }),
  password,
});

export const loginSchema = Joi.object({
  email,
  password: Joi.string().required(),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});




