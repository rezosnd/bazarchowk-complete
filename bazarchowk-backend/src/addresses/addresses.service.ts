import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AddressesService {
  private readonly logger = new Logger(AddressesService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private httpService: HttpService,
  ) {}

  async create(userId: string, createAddressDto: CreateAddressDto) {
    if (createAddressDto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    } else {
      const addressCount = await this.prisma.address.count({ where: { userId } });
      if (addressCount === 0) {
        createAddressDto.isDefault = true;
      }
    }

    // Optional: Reverse Geocode with Mapbox to verify or enrich city/state
    try {
      const token = process.env.MAPBOX_ACCESS_TOKEN;
      if (token && token !== 'your_mapbox_access_token_here') {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${createAddressDto.longitude},${createAddressDto.latitude}.json?access_token=${token}`;
        const response = await firstValueFrom(this.httpService.get(url));
        if (response.data && response.data.features.length > 0) {
          this.logger.log(`Mapbox confirmed coordinates map to: ${response.data.features[0].place_name}`);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to verify address via Mapbox', error.message);
    }

    const address = await this.prisma.address.create({
      data: {
        ...createAddressDto,
        userId,
      },
    });

    // Fire In-App Notification
    await this.notifications.sendInAppNotification(
      userId,
      'New Address Added',
      `You successfully added ${address.title} to your profile.`,
      'SYSTEM'
    );

    return address;
  }

  findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: string, userId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id, userId },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  async update(id: string, userId: string, updateAddressDto: UpdateAddressDto) {
    await this.findOne(id, userId);

    if (updateAddressDto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id },
      data: updateAddressDto,
    });
  }

  async remove(id: string, userId: string) {
    const address = await this.findOne(id, userId);

    await this.prisma.address.delete({
      where: { id },
    });

    if (address.isDefault) {
      const nextAddress = await this.prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (nextAddress) {
        await this.prisma.address.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        });
      }
    }

    return { message: 'Address deleted successfully' };
  }

  async setDefault(id: string, userId: string) {
    await this.findOne(id, userId);

    await this.prisma.$transaction([
      this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      this.prisma.address.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    return { message: 'Default address updated' };
  }

  /**
   * Example of raw PostGIS query using Prisma.
   * Finds addresses within a certain radius (meters) using ST_DWithin and ST_MakePoint.
   */
  async findAddressesWithinRadius(userId: string, targetLat: number, targetLng: number, radiusMeters: number) {
    // Note: PostGIS uses Longitude, Latitude ordering.
    const result = await this.prisma.$queryRaw`
      SELECT id, title, "addressLine1", city,
      ST_DistanceSphere(
        ST_MakePoint(longitude, latitude),
        ST_MakePoint(${targetLng}, ${targetLat})
      ) AS distance
      FROM "Address"
      WHERE "userId" = ${userId}
        AND ST_DWithin(
          ST_MakePoint(longitude, latitude)::geography,
          ST_MakePoint(${targetLng}, ${targetLat})::geography,
          ${radiusMeters}
        )
      ORDER BY distance ASC;
    `;
    return result;
  }
}
