import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto, CreateTimeSlotDto, UpdateSlotCapacityDto } from './dto/create-appointment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ShopsService } from '../shops/shops.service';
import { AppointmentStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly shopsService: ShopsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // ==================== PARTNER: SERVICE OFFERINGS ====================

  async createServiceOffering(shopId: string, data: { name: string; description?: string; price: number; durationMin: number }) {
    return this.prisma.serviceOffering.create({
      data: { shopId, ...data }
    });
  }

  async createServiceOfferingByUser(userId: string, data: { name: string; description?: string; price: number; durationMin: number }) {
    const shop = await this.prisma.shop.findFirst({ where: { ownerId: userId } });
    if (!shop) throw new NotFoundException('No shop found for this user. Please create your shop first.');
    return this.prisma.serviceOffering.create({
      data: { shopId: shop.id, ...data }
    });
  }

  async getShopServices(shopId: string) {
    return this.prisma.serviceOffering.findMany({ where: { shopId, isActive: true } });
  }

  // ==================== PARTNER: PROVIDERS ====================

  async createProvider(shopId: string, data: { name: string; specialty?: string; userId?: string }) {
    return this.prisma.provider.create({
      data: { shopId, ...data }
    });
  }

  async createProviderByUser(userId: string, data: { name: string; specialty?: string; userId?: string }) {
    const shop = await this.prisma.shop.findFirst({ where: { ownerId: userId } });
    if (!shop) throw new NotFoundException('No shop found for this user. Please create your shop first.');
    return this.prisma.provider.create({
      data: { shopId: shop.id, ...data }
    });
  }

  async getShopProviders(shopId: string) {
    return this.prisma.provider.findMany({ where: { shopId, isActive: true } });
  }

  // ==================== PARTNER: SLOT MANAGEMENT ====================

  /**
   * Partner creates a time slot and decides how many customers can book it.
   * e.g., maxCapacity: 3 → 3 different customers can book the same 10:00 AM slot.
   */
  async createTimeSlot(providerId: string, dto: CreateTimeSlotDto) {
    const provider = await this.prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Provider not found');

    return this.prisma.timeSlot.create({
      data: {
        providerId,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        maxCapacity: dto.maxCapacity,
        currentBookings: 0,
        isBooked: false,
      },
    });
  }

  /**
   * Partner can update the max capacity of an existing slot.
   * Can only increase capacity; cannot reduce below current bookings.
   */
  async updateSlotCapacity(slotId: string, providerId: string, dto: UpdateSlotCapacityDto) {
    const slot = await this.prisma.timeSlot.findUnique({ where: { id: slotId } });
    if (!slot) throw new NotFoundException('Time slot not found');
    if (slot.providerId !== providerId) throw new BadRequestException('This slot does not belong to you');

    if (dto.maxCapacity < slot.currentBookings) {
      throw new BadRequestException(
        `Cannot set capacity to ${dto.maxCapacity} — slot already has ${slot.currentBookings} active bookings`
      );
    }

    const isFull = slot.currentBookings >= dto.maxCapacity;
    return this.prisma.timeSlot.update({
      where: { id: slotId },
      data: { maxCapacity: dto.maxCapacity, isBooked: isFull },
    });
  }

  /**
   * Get all slots for a provider with live availability counts.
   */
  async getProviderSlots(providerId: string) {
    const provider = await this.prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Provider not found');
    const capacity = provider.customersPerHour || 1;

    const existingSlots = await this.prisma.timeSlot.findMany({
      where: { providerId },
      orderBy: { startTime: 'asc' },
    });

    const existingMap = new Map();
    for (const s of existingSlots) {
       existingMap.set(s.startTime.toISOString(), s);
    }

    const virtualSlots = [];
    const now = new Date();
    
    // Generate slots for the next 7 days, 9 AM to 8 PM
    for (let day = 0; day < 7; day++) {
      const date = new Date();
      date.setDate(now.getDate() + day);
      
      for (let hour = 9; hour <= 20; hour++) {
        const start = new Date(date);
        start.setHours(hour, 0, 0, 0);
        
        if (start > now) {
          const end = new Date(start);
          end.setHours(hour + 1, 0, 0, 0);
          
          const key = start.toISOString();
          const existing = existingMap.get(key);
          
          virtualSlots.push({
            id: existing ? existing.id : `virtual_${key}`,
            startTime: start,
            endTime: end,
            maxCapacity: existing ? existing.maxCapacity : capacity,
            currentBookings: existing ? existing.currentBookings : 0,
            availableSpots: existing ? (existing.maxCapacity - existing.currentBookings) : capacity,
            isFull: existing ? existing.isBooked : false,
          });
        }
      }
    }
    
    return virtualSlots;
  }

  // ==================== CUSTOMER: BOOKING ====================

  /**
   * Book an appointment. Supports multi-capacity slots.
   * If slot maxCapacity = 3, then 3 different customers can book the same slot.
   * Uses Serializable transaction to prevent race conditions (two customers booking the last spot at the same time).
   */
  async bookAppointment(customerId: string, dto: CreateAppointmentDto) {
    return this.prisma.$transaction(async (tx) => {
      let timeSlotId = dto.timeSlotId;
      
      if (timeSlotId.startsWith('virtual_')) {
          const startTimeIso = timeSlotId.replace('virtual_', '');
          const startTime = new Date(startTimeIso);
          const endTime = new Date(startTime);
          endTime.setHours(endTime.getHours() + 1);
          
          let slot = await tx.timeSlot.findFirst({
              where: { providerId: dto.providerId, startTime }
          });
          
          if (!slot) {
              const p = await tx.provider.findUnique({ where: { id: dto.providerId } });
              slot = await tx.timeSlot.create({
                  data: {
                      providerId: dto.providerId,
                      startTime,
                      endTime,
                      maxCapacity: p?.customersPerHour || 1,
                      currentBookings: 0,
                      isBooked: false
                  }
              });
          }
          timeSlotId = slot.id;
      }
      
      const timeSlot = await tx.timeSlot.findUnique({
        where: { id: timeSlotId },
        include: { provider: { include: { shop: true } } }
      });

      if (!timeSlot) throw new NotFoundException('Time slot not found');
      if (timeSlot.providerId !== dto.providerId) throw new BadRequestException('Time slot does not belong to provider');

      // ✅ SHOP OPEN/HOLIDAY CHECK: Block booking if shop is closed on that date
      const slotDate = new Date(timeSlot.startTime);
      const shopOpenStatus = await this.shopsService.isShopOpenOnDate(timeSlot.provider.shopId, slotDate);
      if (!shopOpenStatus.isOpen) {
        throw new BadRequestException(
          shopOpenStatus.reason || 'Shop is closed on this date. No appointments can be made.'
        );
      }

      // ✅ CAPACITY CHECK: Slot full when currentBookings >= maxCapacity
      if (timeSlot.currentBookings >= timeSlot.maxCapacity) {
        throw new BadRequestException(
          `This slot is full (${timeSlot.currentBookings}/${timeSlot.maxCapacity} booked). Please choose another slot.`
        );
      }

      // ✅ DUPLICATE CHECK: Same customer cannot book same slot twice
      const duplicate = await tx.appointment.findFirst({
        where: { customerId, timeSlotId: timeSlot.id, status: { notIn: ['CANCELLED'] } },
      });
      if (duplicate) throw new BadRequestException('You have already booked this time slot');

      const serviceOffering = await tx.serviceOffering.findUnique({
        where: { id: dto.serviceOfferingId }
      });
      if (!serviceOffering) throw new NotFoundException('Service not found');
      if (serviceOffering.shopId !== timeSlot.provider.shopId) {
        throw new BadRequestException('Service and Provider do not belong to the same shop');
      }

      const newBookings = timeSlot.currentBookings + 1;
      const isFull = newBookings >= timeSlot.maxCapacity;

      // Atomically increment booking count and mark as full if needed
      await tx.timeSlot.update({
        where: { id: timeSlot.id },
        data: {
          currentBookings: newBookings,
          isBooked: isFull,
        }
      });

      // Create appointment
      const appointment = await tx.appointment.create({
        data: {
          customerId,
          serviceOfferingId: dto.serviceOfferingId,
          providerId: dto.providerId,
          timeSlotId: timeSlot.id,
          status: AppointmentStatus.CONFIRMED,
          notes: dto.notes,
          serviceAddressId: dto.serviceAddressId,
          paymentMethod: (dto.paymentMethod as PaymentMethod) || PaymentMethod.COD,
          paymentStatus: (dto.paymentStatus as PaymentStatus) || PaymentStatus.PENDING,
          totalAmount: serviceOffering.price || 0,
        },
        include: {
          provider: { include: { shop: true } },
          serviceOffering: true,
          timeSlot: true,
          serviceAddress: true,
        }
      }) as any;

      this.logger.log(
        `Slot ${dto.timeSlotId}: ${newBookings}/${timeSlot.maxCapacity} booked${isFull ? ' — NOW FULL' : ''}`
      );

      // Notify Shop Owner
      await this.notifications.sendInAppNotification(
        appointment.provider.shop.ownerId,
        'New Appointment Booked',
        `New booking for ${serviceOffering.name}. Slot now ${newBookings}/${timeSlot.maxCapacity} full.`,
        'SYSTEM'
      );

      // Notify Provider if they have a user account
      if (appointment.provider.userId) {
        await this.notifications.sendInAppNotification(
          appointment.provider.userId,
          'New Appointment',
          `You have a new appointment for ${serviceOffering.name} at ${timeSlot.startTime.toLocaleTimeString()}.`,
          'SYSTEM'
        );
      }

      this.realtime.sendToShop(appointment.provider.shopId, 'new_appointment', {
        appointmentId: appointment.id,
        serviceName: serviceOffering.name,
        providerName: appointment.provider.name,
        time: timeSlot.startTime
      });

      return {
        ...appointment,
        slotAvailability: {
          booked: newBookings,
          capacity: timeSlot.maxCapacity,
          spotsLeft: timeSlot.maxCapacity - newBookings,
          isFull,
        }
      };
    }, {
      isolationLevel: 'Serializable', // Prevent race conditions when last spot fills up
    });
  }

  async getCustomerAppointments(customerId: string) {
    return this.prisma.appointment.findMany({
      where: { customerId },
      include: {
        provider: true,
        serviceOffering: true,
        timeSlot: true,
        serviceAddress: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async cancelAppointment(appointmentId: string, customerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({ where: { id: appointmentId } });
      if (!appointment) throw new NotFoundException('Appointment not found');
      if (appointment.customerId !== customerId) throw new BadRequestException('Not your appointment');
      if (appointment.status === AppointmentStatus.CANCELLED) throw new BadRequestException('Already cancelled');

      // Free up one slot when a customer cancels
      await tx.timeSlot.update({
        where: { id: appointment.timeSlotId },
        data: {
          currentBookings: { decrement: 1 },
          isBooked: false, // A spot just opened up
        }
      });

      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.CANCELLED },
        include: { provider: true, serviceOffering: true }
      });

      this.realtime.sendToShop(updated.provider.shopId, 'appointment_cancelled', {
        appointmentId: updated.id,
        serviceName: updated.serviceOffering.name,
        providerName: updated.provider.name
      });

      return updated;
    });
  }

  async getShopAppointments(shopId: string) {
    return this.prisma.appointment.findMany({
      where: { provider: { shopId } },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        provider: true,
        serviceOffering: true,
        timeSlot: true,
        serviceAddress: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAllAppointments() {
    return this.prisma.appointment.findMany({
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        provider: { include: { shop: { select: { name: true } } } },
        serviceOffering: true,
        timeSlot: true,
        serviceAddress: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateAppointmentStatus(appointmentId: string, shopId: string, status: AppointmentStatus) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { provider: true }
    });

    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.provider.shopId !== shopId) throw new BadRequestException('Not your appointment');

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status }
    });
  }
}
