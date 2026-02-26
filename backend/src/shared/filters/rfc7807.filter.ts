import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class Rfc7807ExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    if (!(exception instanceof HttpException)) {
      console.error('[Rfc7807ExceptionFilter] Unhandled Error:', exception);
    }
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception instanceof HttpException
      ? exception.getResponse()
      : { message: 'Internal Server Error' };

    const title = typeof exceptionResponse === 'object' && (exceptionResponse as any).error 
      ? (exceptionResponse as any).error 
      : this.getDefaultTitle(status);

    const detail = typeof exceptionResponse === 'object' && (exceptionResponse as any).message
      ? (exceptionResponse as any).message
      : exception.toString();

    const rfc7807Response = {
      type: `https://zenvix.io/errors/${this.getStatusSlug(status)}`,
      title,
      status,
      detail: Array.isArray(detail) ? detail.join(', ') : detail,
      instance: request.url,
      ...(typeof exceptionResponse === 'object' && (exceptionResponse as any).errors && { errors: (exceptionResponse as any).errors }),
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(rfc7807Response);
  }

  private getDefaultTitle(status: number): string {
    switch (status) {
      case 400: return 'Bad Request';
      case 401: return 'Unauthorized';
      case 403: return 'Forbidden';
      case 404: return 'Not Found';
      case 409: return 'Conflict';
      case 422: return 'Unprocessable Entity';
      case 429: return 'Too Many Requests';
      default: return 'Internal Server Error';
    }
  }

  private getStatusSlug(status: number): string {
    return this.getDefaultTitle(status).toLowerCase().replace(/\s+/g, '-');
  }
}
