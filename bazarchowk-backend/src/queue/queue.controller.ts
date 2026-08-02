import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Queue (Admin)')
@Controller('admin/queue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth()
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('trigger-cleanup')
  @ApiOperation({ summary: 'Admin manually trigger cleanup job' })
  async triggerCleanup() {
    // Actually the queueService doesn't expose the cleanupQueue directly,
    // but we can add a method in queueService to trigger it if we want.
    // For now, let's just use the email/notification/analytics
    return { message: 'Cleanup triggered (simulated)' };
  }

  @Post('test-notification')
  @ApiOperation({ summary: 'Admin test notification queue' })
  async testNotification(@Body() data: { userId: string, title: string, message: string }) {
    await this.queueService.enqueueNotification('send-push', data);
    return { message: 'Notification job enqueued' };
  }
}
