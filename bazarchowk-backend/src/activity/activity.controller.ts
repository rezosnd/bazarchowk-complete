import { Controller, Get, Post, Body, UseGuards, Req, Query, Param } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { RecordLoginDto, RecordSearchDto, RecordActivityDto } from './dto/activity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Activity Tracking & Analytics')
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  // --- RECORDING ACTIONS (Frontend SDK calls these) --- //
  @UseGuards(JwtAuthGuard)
  @Post('login')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record a user login event' })
  recordLogin(@Req() req: any, @Body() dto: RecordLoginDto) {
    return this.activityService.recordLogin(req.user.userId, dto);
  }

  @Post('search')
  @ApiOperation({ summary: 'Record a search event (Guest or Logged In)' })
  recordSearch(@Req() req: any, @Body() dto: RecordSearchDto) {
    // If JWT guard was applied we would strictly extract user. Here we conditionally check.
    const userId = req.user?.userId || null;
    return this.activityService.recordSearch(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('event')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record a generic user activity event' })
  recordActivity(@Req() req: any, @Body() dto: RecordActivityDto) {
    return this.activityService.recordUserActivity(req.user.userId, dto);
  }

  // --- FETCHING ACTIONS --- //
  @UseGuards(JwtAuthGuard)
  @Get('me/logins')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my login history' })
  getMyLogins(@Req() req: any, @Query('limit') limit: number = 20) {
    return this.activityService.getLoginHistory(req.user.userId, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/events')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my activity history' })
  getMyActivity(@Req() req: any, @Query('limit') limit: number = 50) {
    return this.activityService.getUserActivity(req.user.userId, limit);
  }

  // --- ADMIN FETCHING --- //
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('admin/searches/top')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get top trending searches' })
  getTopSearches(@Query('limit') limit: number = 10) {
    return this.activityService.getTopSearches(limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('admin/users/:userId/events')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get activity history for a specific user' })
  getUserEventsAdmin(@Param('userId') userId: string, @Query('limit') limit: number = 50) {
    return this.activityService.getUserActivity(userId, limit);
  }
}
