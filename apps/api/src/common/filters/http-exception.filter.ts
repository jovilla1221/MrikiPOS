import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = 'Terjadi kesalahan pada server';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse() as any;
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        if (exceptionResponse.error?.code) {
          errorCode = exceptionResponse.error.code;
          errorMessage = exceptionResponse.error.message;
        } else if (exceptionResponse.message) {
          errorMessage = Array.isArray(exceptionResponse.message)
            ? exceptionResponse.message.join(', ')
            : exceptionResponse.message;
          errorCode = status === 400 ? 'VALIDATION_ERROR' : 'HTTP_ERROR';
        }
      } else if (typeof exceptionResponse === 'string') {
        errorMessage = exceptionResponse;
      }
    } else {
      // Log unexpected non-HttpException details to server log ONLY
      this.logger.error('Unhandled non-HttpException:', exception);
    }

    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
