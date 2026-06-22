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

  transform(value: unknown, metadata: ArgumentMetadata) {
    // A missing/empty JSON body arrives as undefined for body params.
    // Coerce to {} so object-level rules (e.g. .min(1)) still apply.
    const input =
      value === undefined || value === null
        ? metadata.type === 'body'
          ? {}
          : value
        : value;

    const { error, value: validated } = this.schema.validate(input, {
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
