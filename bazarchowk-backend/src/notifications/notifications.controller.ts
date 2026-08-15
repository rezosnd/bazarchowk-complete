import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmailService } from '../email/email.service';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

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

  @Post('broadcast')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin only: Broadcast notification to specific groups' })
  async broadcastNotification(
    @Body('targetAudience') targetAudience: 'ALL' | 'CUSTOMER' | 'PARTNER' | 'RIDER',
    @Body('title') title: string,
    @Body('message') message: string,
    @Body('imageUrl') imageUrl?: string,
    @Body('linkUrl') linkUrl?: string,
    @CurrentUser() user?: any
  ) {
    return this.notificationsService.sendBroadcastNotification(
      user?.id,
      targetAudience,
      title,
      message,
      imageUrl,
      linkUrl
    );
  }

  // PUBLIC — no auth required: user wants to be notified when BazarChowk launches in their area
  @Post('notify-interest')
  @UseGuards()  // Override class-level guard — this endpoint is public
  @ApiOperation({ summary: 'Public: Register interest for BazarChowk launch in a new area' })
  async notifyInterest(
    @Body('name') name: string,
    @Body('email') email: string,
    @Body('location') location: string,
    @Body('marketName') marketName: string,
  ) {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;

    // 1. Send thank-you email to the user
    await this.emailService.sendTransactionalEmail({
      to: email,
      subject: 'Thank You for Your Interest in BazarChowk! 💚',
      type: 'NOTIFY',
      title: 'We\'ve Got You Covered!',
      customerName: name,
      message: `Hi ${name},<br><br>Thank you for registering your interest in <strong>BazarChowk</strong>!<br><br>We have received your request for the <strong>${location}</strong> area (near <strong>${marketName || 'your local market'}</strong>).<br><br>As soon as BazarChowk launches in your area, you will be the <strong>first to know</strong>. We are working hard to expand to new cities and towns every week.<br><br>Stay tuned — big things are coming your way! 🚀`,
      buttonText: 'Learn More About BazarChowk',
      buttonUrl: 'https://bazarchowk.in',
    });

    // 2. Alert admin about the new interest registration
    if (adminEmail) {
      await this.emailService.sendTransactionalEmail({
        to: adminEmail,
        subject: `[New Interest] ${name} wants BazarChowk in ${location}`,
        type: 'ADMIN_ALERT',
        title: 'New Area Interest Registration',
        customerName: 'Admin',
        message: `A new user has requested BazarChowk in their area:<br><br><strong>Name:</strong> ${name}<br><strong>Email:</strong> ${email}<br><strong>Location:</strong> ${location}<br><strong>Market Name:</strong> ${marketName || 'Not specified'}`,
        buttonText: 'View Admin Panel',
        buttonUrl: 'https://admin.bazarchowk.in',
      });
    }

    return { success: true, message: 'Thank you! We will notify you when BazarChowk launches in your area.' };
  }
}
