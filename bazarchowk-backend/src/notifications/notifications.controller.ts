import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('device')
  @ApiOperation({ summary: 'Register a device for push notifications' })
  registerDevice(@Body() dto: RegisterDeviceDto, @CurrentUser() user: any) {
    return this.notificationsService.registerDeviceToken(user.id, dto.token, dto.deviceOs);
  }

  @Post('device/remove')
  @ApiOperation({ summary: 'Remove a device token (e.g. on logout)' })
  removeDevice(@Body('token') token: string) {
    return this.notificationsService.removeDeviceToken(token);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user notifications' })
  getNotifications(@CurrentUser() user: any) {
    return this.notificationsService.getUserNotifications(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a specific notification as read' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.id);
  }
}
