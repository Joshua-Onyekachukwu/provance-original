import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

/**
 * ParseIntStrictPipe — rejects non-integer query garbage BEFORE a
 * DefaultValuePipe can swallow it.
 *
 * The production ValidationPipe runs with `enableImplicitConversion`, which
 * turns a garbage value like `?page=abc` into `NaN` before route-param pipes
 * execute. The classic `@Query('page', new DefaultValuePipe(1), ParseIntPipe)`
 * ordering then silently degrades `page=abc` to the default (DefaultValuePipe
 * replaces NaN), hiding client bugs. This pipe runs FIRST in the chain and
 * throws a 400 for any PRESENT value that is not an integer, while passing
 * `undefined`/`null` through untouched so DefaultValuePipe can still supply
 * the default for an omitted parameter.
 *
 * Usage:
 *   @Query('page', new ParseIntStrictPipe(), new DefaultValuePipe(1), ParseIntPipe)
 *     page: number,
 */
@Injectable()
export class ParseIntStrictPipe
  implements PipeTransform<string | number | undefined, string | number | undefined>
{
  transform(value: string | number | undefined, metadata: ArgumentMetadata) {
    // Missing (or explicitly null) → let DefaultValuePipe supply the default.
    if (value === undefined || value === null) {
      return value;
    }

    const numeric = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(numeric) || !Number.isInteger(numeric)) {
      throw new BadRequestException(
        `${metadata.data || 'Query parameter'} must be an integer.`,
      );
    }

    return value;
  }
}
