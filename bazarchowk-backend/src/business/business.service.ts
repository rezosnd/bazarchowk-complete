import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BusinessType, BusinessStatus } from '@prisma/client';

@Injectable()
export class BusinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async registerBusiness(ownerId: string, data: any) {
    const business = await this.prisma.business.create({
      data: {
        businessName: data.businessName,
        businessType: data.businessType as BusinessType,
        ownerId,
        email: data.email,
        phone: data.phone,
        status: BusinessStatus.PENDING,
        profile: {
          create: {
            description: data.description,
            languagesSupported: data.languagesSupported || [],
          }
        },
        locations: {
          create: {
            addressLine1: data.addressLine1,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
            latitude: data.latitude,
            longitude: data.longitude,
          }
        }
      },
      include: { profile: true, locations: true }
    });

    // Notify SuperAdmin
    await this.notifications.sendInAppNotification(
      ownerId,
      'Registration Submitted',
      `Your business ${business.businessName} has been submitted for review.`,
      'BUSINESS'
    );

    return business;
  }

  async uploadDocument(businessId: string, ownerId: string, documentType: string, documentUrl: string) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business || business.ownerId !== ownerId) throw new BadRequestException('Unauthorized');

    return this.prisma.businessDocument.create({
      data: {
        businessId,
        documentType,
        documentUrl,
      }
    });
  }

  async approveBusiness(businessId: string, adminId: string) {
    const updated = await this.prisma.business.update({
      where: { id: businessId },
      data: { status: BusinessStatus.APPROVED, verificationStatus: 'VERIFIED' }
    });

    await this.prisma.businessAuditLog.create({
      data: {
        businessId,
        action: 'APPROVED',
        performedBy: adminId,
        details: 'Business officially verified and approved by admin.',
      }
    });

    await this.notifications.sendInAppNotification(
      updated.ownerId,
      'Business Approved! 🎉',
      `Congratulations! ${updated.businessName} is now fully verified and live.`,
      'SYSTEM'
    );

    return updated;
  }

  async getMyBusinesses(ownerId: string) {
    return this.prisma.business.findMany({
      where: { ownerId },
      include: { profile: true, branches: true, documents: true, verifications: true }
    });
  }
}
