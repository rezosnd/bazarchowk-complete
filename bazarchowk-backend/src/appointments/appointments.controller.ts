import { Controller, Post, Body, Get, Patch, Param, UseGuards, Delete } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, CreateTimeSlotDto, UpdateSlotCapacityDto } from './dto/create-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // ==================== PARTNER: SERVICE OFFERINGS ====================

  @Post('services')
  @UseGuards(RolesGuard)
  @Roles('SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Partner: Create a new service offering' })
  async createService(
    @Body() data: { name: string; description?: string; price: number; durationMin: number },
    @CurrentUser() user: any
  ) {
    return this.appointmentsService.createServiceOfferingByUser(user.id, data);
  }

  @Get('services/:shopId')
  @ApiOperation({ summary: 'Get all active services for a shop' })
  getShopServices(@Param('shopId') shopId: string) {
    return this.appointmentsService.getShopServices(shopId);
  }

  // ==================== PARTNER: PROVIDERS ====================

  @Post('providers')
  @UseGuards(RolesGuard)
  @Roles('SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Partner: Add a new provider (staff member)' })
  async createProvider(
    @Body() data: { name: string; specialty?: string; userId?: string },
    @CurrentUser() user: any
  ) {
    return this.appointmentsService.createProviderByUser(user.id, data);
  }

  @Get('providers/:shopId')
  @ApiOperation({ summary: 'Get all active providers for a shop' })
  getShopProviders(@Param('shopId') shopId: string) {
    return this.appointmentsService.getShopProviders(shopId);
  }

  // ==================== PARTNER: SLOT MANAGEMENT ====================

  @Post('slots/create')
  @UseGuards(RolesGuard)
  @Roles('SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Partner: Create a time slot with custom capacity',
    description: 'Set maxCapacity to 1 for exclusive 1-on-1. Set to 3 to allow 3 customers in the same slot (e.g., group classes, multi-chair salons).',
  })
  createSlot(@Body() dto: CreateTimeSlotDto, @CurrentUser() user: any) {
    return this.appointmentsService.createTimeSlot(dto.providerId, dto);
  }

  @Get('slots/provider/:providerId')
  @ApiOperation({ summary: 'Get all time slots for a provider with live availability' })
  @ApiParam({ name: 'providerId', description: 'Provider ID' })
  getProviderSlots(@Param('providerId') providerId: string) {
    return this.appointmentsService.getProviderSlots(providerId);
  }

  @Patch('slots/:slotId/capacity')
  @UseGuards(RolesGuard)
  @Roles('SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Partner: Update the max customer capacity for an existing slot',
    description: 'Cannot reduce capacity below current active bookings.',
  })
  @ApiParam({ name: 'slotId', description: 'Time Slot ID' })
  updateSlotCapacity(
    @Param('slotId') slotId: string,
    @Body() dto: UpdateSlotCapacityDto,
    @CurrentUser() user: any,
  ) {
    return this.appointmentsService.updateSlotCapacity(slotId, user.providerId || user.id, dto);
  }

  // ==================== CUSTOMER: BOOKING ====================

  @Post()
  @ApiOperation({
    summary: 'Customer: Book an appointment',
    description: 'If partner set maxCapacity > 1, multiple customers can book same slot. System auto-checks availability.',
  })
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: any) {
    return this.appointmentsService.bookAppointment(user.id, dto);
  }

  @Get('my-appointments')
  @ApiOperation({ summary: 'Customer: Get all my appointments' })
  getMyAppointments(@CurrentUser() user: any) {
    return this.appointmentsService.getCustomerAppointments(user.id);
  }

  @Delete(':id/cancel')
  @ApiOperation({ summary: 'Customer: Cancel an appointment (automatically frees up a slot)' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  cancelAppointment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.appointmentsService.cancelAppointment(id, user.id);
  }

  // ==================== PARTNER: MANAGE APPOINTMENTS ====================

  @Get('shop/all')
  @UseGuards(RolesGuard)
  @Roles('SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Partner: Get all appointments for shop' })
  getShopAppointments(@CurrentUser() user: any) {
    return this.appointmentsService.getShopAppointmentsByOwner(user.id);
  }

  // ==================== ADMIN: PLATFORM APPOINTMENTS ====================

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: Get all appointments across platform' })
  getAllAppointments() {
    return this.appointmentsService.getAllAppointments();
  }

  @Patch('shop/:id/status')
  @UseGuards(RolesGuard)
  @Roles('SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Partner: Update appointment status' })
  updateAppointmentStatus(
    @Param('id') id: string,
    @Body('status') status: any,
    @CurrentUser() user: any
  ) {
    return this.appointmentsService.updateAppointmentStatus(id, user.shopId || user.id, status);
  }
}
