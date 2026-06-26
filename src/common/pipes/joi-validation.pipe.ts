import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ObjectSchema } from 'joi';
import { MESSAGES } from '../constants';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private readonly schema: ObjectSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    const input =
      value === undefined || value === null
        ? metadata.type === 'body' ? {} : value
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
