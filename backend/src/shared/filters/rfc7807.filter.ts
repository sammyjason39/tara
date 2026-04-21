import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

import * as fs from "fs";
import * as path from "path";

@Catch()
export class Rfc7807ExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status === 400) {
      fs.appendFileSync(
        path.join(process.cwd(), "logs", "debug_400.log"),
        `[${new Date().toISOString()}] 400 Error at ${request.url}\nException: ${JSON.stringify(exception, null, 2)}\nResponse: ${JSON.stringify(exception instanceof HttpException ? exception.getResponse() : {}, null, 2)}\n\n`
      );
    }

    if (status >= 500) {
      // CRITICAL: Log 500 errors with full context
      const tenantId = request.headers['x-tenant-id'] || (request as any).tenantContext?.tenant_id || 'NONE';
      const userId = request.headers['x-user-id'] || 'NONE';
      const requestId = request.headers['x-request-id'] || 'NONE';

      const errorLog = `
[${new Date().toISOString()}] 500 ERROR | ${request.method} ${request.url}
Request ID: ${requestId}
Tenant: ${tenantId}
User: ${userId}
Message: ${exception.message || exception}
Stack: ${exception.stack || 'No Stack Trace'}
--------------------------------------------------------------------------------`;
      fs.appendFileSync(path.join(process.cwd(), "logs", "system_errors.log"), errorLog);
      console.error(`[SYSTEM_CRITICAL_FAILURE] [RID:${requestId}] ${request.method} ${request.url}`, exception);
    }

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: "Internal Server Error" };

    const title =
      typeof exceptionResponse === "object" && (exceptionResponse as any).error
        ? (exceptionResponse as any).error
        : this.getDefaultTitle(status);

    const detail =
      typeof exceptionResponse === "object" &&
      (exceptionResponse as any).message
        ? (exceptionResponse as any).message
        : exception.toString();

    const rfc7807Response = {
      type: `https://zenvix.io/errors/${this.getStatusSlug(status)}`,
      title,
      status,
      detail: Array.isArray(detail) ? detail.join(", ") : detail,
      instance: request.url,
      ...(typeof exceptionResponse === "object" &&
        (exceptionResponse as any).errors && {
          errors: (exceptionResponse as any).errors,
        }),
      timestamp: new Date().toISOString(),
      request_id: request.headers['x-request-id'], // Include for debugging correlation
    };

    response.status(status).json(rfc7807Response);
  }

  private getDefaultTitle(status: number): string {
    switch (status) {
      case 400:
        return "Bad Request";
      case 401:
        return "Unauthorized";
      case 403:
        return "Forbidden";
      case 404:
        return "Not Found";
      case 409:
        return "Conflict";
      case 422:
        return "Unprocessable Entity";
      case 429:
        return "Too Many Requests";
      default:
        return "Internal Server Error";
    }
  }

  private getStatusSlug(status: number): string {
    return this.getDefaultTitle(status).toLowerCase().replace(/\s+/g, "-");
  }
}
