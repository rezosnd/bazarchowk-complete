import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import * as Sentry from '@sentry/node';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly prisma: PrismaService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let stackTrace = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      message = typeof responseBody === 'string' ? responseBody : (responseBody as any).message || JSON.stringify(responseBody);
    } else if (exception instanceof Error) {
      message = exception.message;
      stackTrace = exception.stack;
    }

    const errorContext = {
      statusCode: status,
      path: request.url,
      method: request.method,
      userId: (request as any).user?.userId || null,
      ipAddress: request.ip,
      timestamp: new Date().toISOString(),
    };

    // 1. Console Logging
    this.logger.error(`[${errorContext.method}] ${errorContext.path} - ${status} - ${message}`, stackTrace);

    // 2. Physical Database Logging for Observability
    try {
      // Don't await strictly to prevent bottlenecking the error response
      this.prisma.systemErrorLog.create({
        data: {
          statusCode: status,
          message: typeof message === 'string' ? message : JSON.stringify(message),
          path: errorContext.path,
          method: errorContext.method,
          stackTrace: stackTrace,
          userId: errorContext.userId,
          ipAddress: errorContext.ipAddress,
        }
      }).catch((dbErr: any) => this.logger.error('Failed to write error to DB', dbErr));
    } catch (e) {
      // Fail silently if DB is down
    }

    // 3. Sentry Integration (if active)
    if (process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setTag('path', errorContext.path);
        scope.setTag('method', errorContext.method);
        scope.setExtra('userId', errorContext.userId);
        Sentry.captureException(exception);
      });
    }

    // Return standardized response
    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: errorContext.timestamp,
      path: errorContext.path,
    });
  }
}
