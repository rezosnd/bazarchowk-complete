import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

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
            // In a production environment, you might fire an event to a Slack/Discord webhook here.
          }
        }),
      );
  }
}
