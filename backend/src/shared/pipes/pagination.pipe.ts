import {
  Injectable,
  PipeTransform,
  BadRequestException,
} from "@nestjs/common";

/**
 * Pagination parameters parsed and validated by PaginationPipe.
 * Used by controllers to apply consistent pagination across all list endpoints.
 */
export interface PaginationParams {
  page: number; // >= 1
  pageSize: number; // 1-200, default 50
}

/**
 * PaginationPipe
 *
 * Parses and validates pagination query parameters.
 * - `page`: defaults to 1, must be >= 1
 * - `pageSize`: defaults to 50, must be between 1 and 200
 *
 * Throws BadRequestException for invalid (non-numeric or out-of-range) values.
 *
 * Usage in controllers:
 *   @Get()
 *   findAll(@Query(PaginationPipe) pagination: PaginationParams) { ... }
 */
@Injectable()
export class PaginationPipe implements PipeTransform {
  transform(value: any): PaginationParams {
    const rawPage = value?.page;
    const rawPageSize = value?.pageSize;

    const page = this.parseParam(rawPage, "page", 1);
    const pageSize = this.parseParam(rawPageSize, "pageSize", 50);

    if (page < 1) {
      throw new BadRequestException(
        "Invalid pagination params: page must be >= 1",
      );
    }

    if (pageSize < 1) {
      throw new BadRequestException(
        "Invalid pagination params: pageSize must be >= 1",
      );
    }

    if (pageSize > 200) {
      throw new BadRequestException(
        "Invalid pagination params: pageSize must be <= 200",
      );
    }

    return { page, pageSize };
  }

  private parseParam(
    raw: unknown,
    name: string,
    defaultValue: number,
  ): number {
    if (raw === undefined || raw === null || raw === "") {
      return defaultValue;
    }

    const parsed = Number(raw);

    if (isNaN(parsed) || !Number.isFinite(parsed)) {
      throw new BadRequestException(
        `Invalid pagination params: ${name} must be a valid number`,
      );
    }

    return Math.floor(parsed);
  }
}
