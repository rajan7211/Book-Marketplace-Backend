import * as Joi from 'joi';
import { OtpPurpose } from '../enums/otp-purpose.enum';

const email = Joi.string().email().lowercase().trim().required();
const password = Joi.string().min(6).max(72).required();

const purpose = Joi.string()
  .valid(OtpPurpose.REGISTRATION, OtpPurpose.PASSWORD_RESET)
  .required()
  .messages({
    'any.only': 'purpose must be either REGISTRATION or PASSWORD_RESET',
  });

// ───── Customer registration (Pattern B) ─────
const firstNameSchema = Joi.string().trim().min(1).max(50).when('purpose', {
  is: OtpPurpose.REGISTRATION,
  then: Joi.required(),
  otherwise: Joi.optional(),
});
const lastNameSchema = Joi.string().trim().min(1).max(50).when('purpose', {
  is: OtpPurpose.REGISTRATION,
  then: Joi.required(),
  otherwise: Joi.optional(),
});
const passwordSchemaCustomer = Joi.string().min(6).max(72).when('purpose', {
  is: OtpPurpose.REGISTRATION,
  then: Joi.required(),
  otherwise: Joi.optional(),
});

export const registerSchema = Joi.object({
  email,
  purpose,
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  password: passwordSchemaCustomer,
});

export const resendOtpSchema = Joi.object({ email, purpose });

export const verifyOtpSchema = Joi.object({
  email,
  purpose,
  otp: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required()
    .messages({ 'string.pattern.base': 'otp must be exactly 6 digits' }),
});

// ───── Seller registration ─────
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

// ───── Login / Refresh ─────
export const loginSchema = Joi.object({ email, password });

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// ───── Password recovery ─────
export const forgotPasswordSchema = Joi.object({ email });

export const resetPasswordSchema = Joi.object({
  email,
  otp: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required()
    .messages({ 'string.pattern.base': 'otp must be exactly 6 digits' }),
  newPassword: password,
});

export const changePasswordSchema = Joi.object({
  currentPassword: password,
  newPassword: password,
}).custom((value, helpers) => {
  if (value.currentPassword === value.newPassword) {
    return helpers.error('any.invalid');
  }
  return value;
}).messages({
  'any.invalid': 'newPassword must be different from currentPassword',
});
