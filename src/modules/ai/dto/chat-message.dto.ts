import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Request body for POST /ai/chat and POST /ai/chat/stream.
 *
 * NOTE: this class exists only for Swagger documentation. Runtime validation
 * is performed by the Joi schema in `validation/chat.validation.ts` (the
 * project's convention — see JoiValidationPipe).
 */
export class ChatMessageDto {
  @ApiProperty({
    example: 'Do you have Atomic Habits in stock and what is the price?',
    description: 'The user message to send to the assistant.',
  })
  message: string;

  @ApiPropertyOptional({
    description:
      'Opaque session id to continue an existing conversation. Omit to start a new one.',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  sessionId?: string;
}