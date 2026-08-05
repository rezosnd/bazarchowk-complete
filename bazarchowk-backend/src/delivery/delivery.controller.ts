import { Controller, Get, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DeliveryStatus } from '@prisma/client';

@ApiTags('Delivery')
@Controller('delivery')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get('available')
  @UseGuards(RolesGuard)
  @Roles('RIDER', 'DELIVERY_PARTNER', 'ADMIN')
  @ApiOperation({ summary: 'Get available pending deliveries for riders (Geo-fenced)' })
  getAvailableDeliveries(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    return this.deliveryService.getAvailableDeliveries(
      lat ? parseFloat(lat) : undefined,
      lng ? parseFloat(lng) : undefined
    );
  }

  @Get('my-active')
  @UseGuards(RolesGuard)
  @Roles('RIDER', 'DELIVERY_PARTNER', 'ADMIN')
  @ApiOperation({ summary: 'Get active deliveries for the current rider' })
  getMyActiveDeliveries(@CurrentUser() user: any) {
    return this.deliveryService.getMyActiveDeliveries(user.id);
  }

  @Patch(':id/assign')
  @UseGuards(RolesGuard)
  @Roles('RIDER', 'DELIVERY_PARTNER', 'ADMIN')
  @ApiOperation({ summary: 'Rider accepts a delivery' })
  assignDelivery(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deliveryService.assignDelivery(id, user.id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('RIDER', 'DELIVERY_PARTNER', 'ADMIN')
  @ApiOperation({ summary: 'Update delivery status (e.g., DELIVERED)' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: DeliveryStatus,
    @Body('proofImageUrl') proofImageUrl: string,
    @CurrentUser() user: any
  ) {
    return this.deliveryService.updateDeliveryStatus(id, user.id, status, proofImageUrl);
  }

  @Get('rider/earnings')
  @UseGuards(RolesGuard)
  @Roles('RIDER', 'DELIVERY_PARTNER')
  @ApiOperation({ summary: 'Get rider earnings and cash in hand' })
  getRiderEarnings(
    @Query('filter') filter: 'TODAY' | 'WEEK' | 'MONTH',
    @CurrentUser() user: any
  ) {
    return this.deliveryService.getRiderEarnings(user.id, filter);
  }
}
