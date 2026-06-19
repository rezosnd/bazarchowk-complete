import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
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
  @Roles('DELIVERY_PARTNER', 'ADMIN')
  @ApiOperation({ summary: 'Get all unassigned deliveries (for Riders)' })
  getAvailableDeliveries() {
    return this.deliveryService.getAvailableDeliveries();
  }

  @Patch(':id/assign')
  @UseGuards(RolesGuard)
  @Roles('DELIVERY_PARTNER', 'ADMIN')
  @ApiOperation({ summary: 'Rider accepts a delivery' })
  assignDelivery(@Param('id') id: string, @Body('deliveryPartnerId') partnerId: string) {
    return this.deliveryService.assignDelivery(id, partnerId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('DELIVERY_PARTNER', 'ADMIN')
  @ApiOperation({ summary: 'Update delivery status (e.g., DELIVERED)' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: DeliveryStatus,
    @Body('proofImageUrl') proofImageUrl: string,
    @CurrentUser() user: any
  ) {
    return this.deliveryService.updateDeliveryStatus(id, user.id, status, proofImageUrl);
  }
}
