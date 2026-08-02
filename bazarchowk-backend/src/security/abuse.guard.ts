import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class AbuseDetectionGuard implements CanActivate {
  // In a real application, this might use Redis to track failed attempts or block IPs dynamically
  private blocklist = new Set<string>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress;

    // 1. IP Blocklist check
    if (this.blocklist.has(ip)) {
      throw new HttpException('Access denied due to abuse detection', HttpStatus.FORBIDDEN);
    }

    // 2. Simple bot/scraper detection
    const userAgent = request.headers['user-agent'] || '';
    if (userAgent.includes('curl') || userAgent.includes('python-requests') || userAgent.includes('bot')) {
      // Allow specific endpoints or block entirely
      // throw new HttpException('Automated scraping is not allowed', HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
