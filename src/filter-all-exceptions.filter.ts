import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const errorResponse = exception.getResponse();
      let errors: unknown;
      if (typeof errorResponse === 'string') {
        message = errorResponse;
      } else if (typeof errorResponse === 'object' && errorResponse !== null) {
        const raw = (errorResponse as any).message;
        errors = (errorResponse as any).errors;
        if (Array.isArray(raw)) {
          message = raw.join(', ');
        } else if (typeof raw === 'string') {
          message = raw;
        } else {
          message = JSON.stringify(errorResponse);
        }
      }

      console.error(
        `HTTP Exception (${status}):`,
        JSON.stringify(
          {
            message,
            errors,
            path: request.url,
            method: request.method,
            body: request.body,
          },
          null,
          2,
        ),
      );
    } else {
      console.error('Unhandled exception:', exception);
    }

    const body: Record<string, unknown> = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    };
    if (
      exception instanceof HttpException &&
      typeof exception.getResponse() === 'object' &&
      exception.getResponse() !== null
    ) {
      const errObj = exception.getResponse() as Record<string, unknown>;
      if (Array.isArray(errObj.errors)) {
        body.errors = errObj.errors;
      }
    }

    response.status(status).json(body);
  }
}
