import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ObjectSchema } from 'joi';
import { MESSAGES } from '../constants';

/**
 * Joi validation pipe (Phase 13 of the roadmap).
 * Usage: @Body(new JoiValidationPipe(createBookSchema)) dto: CreateBookDto
 *
 * - abortEarly:false  -> collect all errors
 * - stripUnknown:true -> drop fields not in the schema (whitelist)
 * - convert:true      -> coerce query strings to numbers/booleans
 */
@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private readonly schema: ObjectSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const { error, value: validated } = this.schema.validate(value, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      throw new BadRequestException({
        message: MESSAGES.VALIDATION.FAILED,
        details: error.details.map((d) => ({
          field: d.path.join('.'),
          message: d.message.replace(/"/g, ''),
        })),
      });
    }
    return validated;
  }
}
