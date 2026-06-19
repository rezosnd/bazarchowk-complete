import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RealtimeService {
  constructor(private readonly prisma: PrismaService) {}

  async saveTrackingPoint(orderId: string, riderId: string, latitude: number, longitude: number, heading?: number, speed?: number) {
    // Optionally check if the order is currently active before saving.
    return this.prisma.trackingPoint.create({
      data: {
        orderId,
        riderId,
        latitude,
        longitude,
        heading,
        speed
      }
    });
  }
}
