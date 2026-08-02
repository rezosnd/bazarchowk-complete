import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP_PERF');

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next
      .handle()
      .pipe(
        tap(() => {
          const delay = Date.now() - now;
          const response = ctx.getResponse();
          this.logger.log(`${method} ${url} ${response.statusCode} - ${delay}ms`);

          // Alert on slow APIs (over 1000ms)
          if (delay > 1000) {
            this.logger.warn(`[SLOW API ALERT] ${method} ${url} took ${delay}ms`);
            
            // Log to database for dashboard visibility
            this.prisma.operationalLog.create({
              data: {
                severity: 'WARNING',
                module: 'SYSTEM_PERFORMANCE',
                message: `Slow API Detected: ${method} ${url} took ${delay}ms`,
                context: { method, url, delay, statusCode: response.statusCode, userAgent: request.headers['user-agent'] }
              }
            }).catch(err => this.logger.error('Failed to write operational log', err));
          }
        }),
      );
  }
}
