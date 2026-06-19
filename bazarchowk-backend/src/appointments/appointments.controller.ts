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

  // ==================== PARTNER: SLOT MANAGEMENT ====================

  @Post('slots/create')
  @UseGuards(RolesGuard)
  @Roles('SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Partner: Create a time slot with custom capacity',
    description: 'Set maxCapacity to 1 for exclusive 1-on-1. Set to 3 to allow 3 customers in the same slot (e.g., group classes, multi-chair salons).',
  })
  createSlot(@Body() dto: CreateTimeSlotDto, @CurrentUser() user: any) {
    // In production, resolve providerId from the logged-in SHOP_OWNER user's provider profile
    return this.appointmentsService.createTimeSlot(user.providerId || user.id, dto);
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
}
