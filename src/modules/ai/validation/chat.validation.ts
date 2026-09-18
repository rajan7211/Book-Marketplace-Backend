import * as Joi from 'joi';

/**
 * Joi schema for the chat endpoint. Consumed by `JoiValidationPipe` (the
 * project-wide validation pattern). Runtime validation — the Swagger DTO is
 * separate (see dto/chat-message.dto.ts).
 */
export const chatSchema = Joi.object({
  message: Joi.string()
    .trim()
    .min(1)
    .max(2000)
    .required()
    .messages({
      'string.empty': 'message is required',
      'string.min': 'message must not be empty',
      'string.max': 'message must be at most 2000 characters',
    }),
  sessionId: Joi.string().trim().max(100).optional(),
});