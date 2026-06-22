/**
 * Shared correctness primitives for the five core operational modules
 * (IT, Procurement, Sales, Marketing, Payment).
 *
 * Re-exports the typed error surface, the Prisma error-mapping layer, and the
 * tenant-scoped composite-key read helpers so every core module imports the
 * same discipline from one place.
 */
export {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  mapPrismaError,
  prismaErrorToHttpException,
} from "./errors/prisma-error.mapper";

export {
  FindFirstDelegate,
  scopedWhere,
  findScoped,
  findScopedOrThrow,
} from "./errors/scoped-read.helper";
