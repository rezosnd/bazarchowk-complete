import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private eventEmitter: EventEmitter2,
    private prisma: PrismaService
  ) {}

  /**
   * Publishes an event to the Event Bus and securely logs it to the physical database (Outbox pattern).
   */
  async publish(eventName: string, payload: any, correlationId?: string) {
    this.logger.log(`[Event Bus] Publishing: ${eventName}`);

    // 1. Emit the event in memory for other NestJS modules to catch via @OnEvent()
    this.eventEmitter.emit(eventName, payload);

    // 2. Persist the event to PostgreSQL for disaster recovery and auditing
    try {
      await this.prisma.systemEvent.create({
        data: {
          eventName,
          payload: JSON.stringify(payload),
          correlationId
        }
      });
    } catch (error) {
      this.logger.error(`[Event Bus] Failed to persist event to DB: ${eventName}`, error);
    }
  }

  // Helper Wrappers for strong typing
  
  async publishOrderCreated(payload: any) {
    return this.publish('order.created', payload);
  }

  async publishPaymentSuccess(payload: any) {
    return this.publish('payment.success', payload);
  }

  async publishAppointmentScheduled(payload: any) {
    return this.publish('appointment.scheduled', payload);
  }
}
