import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { MESSAGES } from '../constants';

/** Rejects malformed Mongo ObjectIds before they hit a service. */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isValidObjectId(value)) {
      throw new BadRequestException(MESSAGES.VALIDATION.INVALID_ID);
    }
    return value;
  }
}
