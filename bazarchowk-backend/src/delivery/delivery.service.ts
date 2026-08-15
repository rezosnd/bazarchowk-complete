import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { DeliveryStatus, OrderStatus } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
    @Inject(forwardRef(() => OrdersService)) private readonly ordersService: OrdersService,
  ) {}

  // Haversine formula to calculate distance in km
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  async getAvailableDeliveries(lat?: number, lng?: number, userId?: string) {
    let marketId = undefined;
    if (userId) {
      const partner = await this.prisma.deliveryPartner.findUnique({ where: { userId } });
      if (partner?.marketId) {
        marketId = partner.marketId;
      }
    }

    const whereClause: any = { status: DeliveryStatus.UNASSIGNED };
    if (marketId) {
      whereClause.order = { shop: { marketId } };
    }

    const deliveries = await this.prisma.delivery.findMany({
      where: whereClause,
      include: { order: { include: { shop: true, deliveryAddress: true, items: { include: { productVariant: { include: { product: true } } } } } } },
    });

    if (lat && lng && !marketId) {
      // Filter out deliveries that are > 25km away from the Rider's current location
      return deliveries.filter(d => {
        if (!d.order?.shop?.latitude || !d.order?.shop?.longitude) return false;
        const dist = this.calculateDistance(lat, lng, d.order.shop.latitude, d.order.shop.longitude);
        return dist <= 25; // 25 km radius restriction
      });
    }

    return deliveries;
  }

  async getMyActiveDeliveries(userId: string) {
    const partner = await this.prisma.deliveryPartner.findUnique({ where: { userId } });
    if (!partner) return [];
    
    return this.prisma.delivery.findMany({
      where: {
        deliveryPartnerId: partner.id,
        status: { notIn: [DeliveryStatus.DELIVERED, DeliveryStatus.FAILED] }
      },
      include: { order: { include: { shop: true, customer: true, deliveryAddress: true, items: { include: { productVariant: { include: { product: true } } } } } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getDeliveryHistory(userId: string) {
    const partner = await this.prisma.deliveryPartner.findUnique({ where: { userId } });
    if (!partner) return [];
    
    return this.prisma.delivery.findMany({
      where: { deliveryPartnerId: partner.id },
      include: { order: { include: { shop: true, customer: true, deliveryAddress: true, items: { include: { productVariant: { include: { product: true } } } } } } },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }

  async assignDelivery(deliveryId: string, userId: string) {
    const updatedDelivery = await this.prisma.$transaction(async (prisma) => {
      // Check assignment inside transaction to prevent race conditions
      const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId }, include: { order: true } });
      if (!delivery) throw new NotFoundException('Delivery not found');
      if (delivery.status !== DeliveryStatus.UNASSIGNED) throw new BadRequestException('This delivery has already been assigned to another rider.');

      // Find the DeliveryPartner record for this user
      let partner = await prisma.deliveryPartner.findUnique({ where: { userId } });
      
      // Auto-create profile if missing so the rider can start working immediately
      if (!partner) {
        partner = await prisma.deliveryPartner.create({
          data: {
            userId,
            vehicleType: 'Bike',
            isOnline: true
          }
        });
      }

      const d = await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          deliveryPartnerId: partner.id,
          status: DeliveryStatus.ASSIGNED,
        },
        include: { order: true },
      });

      // Update Order riderId
      await prisma.order.update({
        where: { id: delivery.orderId },
        data: { riderId: partner.userId },
      });

      // Auto-create chat conversation between Customer and Rider
      const conversationExists = await prisma.conversation.findUnique({ where: { id: delivery.orderId } });
      if (!conversationExists) {
        await prisma.conversation.create({
          data: {
            id: delivery.orderId,
            type: 'CUSTOMER_RIDER',
            orderId: delivery.orderId,
            participants: {
              create: [
                { userId: delivery.order.customerId, role: 'MEMBER' },
                { userId: partner.userId, role: 'MEMBER' }
              ]
            }
          }
        });
      }

      return d;
    });

    // Notify Shop Owner correctly by traversing shop
    const shop = await this.prisma.shop.findUnique({ where: { id: updatedDelivery.order.shopId } });
    if (shop) {
      await this.notifications.sendInAppNotification(
        shop.ownerId,
        'Rider Assigned',
        `A rider has been assigned to Order ${updatedDelivery.order.orderNumber}`,
        'DELIVERY'
      );
    }

    // Notify Customer too!
    await this.notifications.sendInAppNotification(
      updatedDelivery.order.customerId,
      'Rider Assigned',
      `A delivery partner has been assigned to your order.`,
      'DELIVERY'
    );

    return updatedDelivery;
  }

  async updateDeliveryStatus(deliveryId: string, partnerUserId: string, status: DeliveryStatus, proofImageUrl?: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { deliveryPartner: true, order: true }
    });

    if (!delivery) throw new NotFoundException('Delivery not found');
    if (!delivery.deliveryPartner || delivery.deliveryPartner.userId !== partnerUserId) {
      throw new BadRequestException('Not authorized for this delivery');
    }

    const updated = await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status,
        ...(proofImageUrl && { proofOfDeliveryImageUrl: proofImageUrl }),
      },
    });

    let orderStatus: OrderStatus | undefined;
    if (status === DeliveryStatus.PICKED_UP) orderStatus = OrderStatus.PICKED_UP;
    if (status === DeliveryStatus.IN_TRANSIT) orderStatus = OrderStatus.PICKED_UP;
    if (status === DeliveryStatus.DELIVERED) orderStatus = OrderStatus.DELIVERED;

    if (orderStatus) {
      // Delegate ALL order state changes, earnings, and cash collection to OrdersService
      await this.ordersService.updateOrderStatus(delivery.orderId, partnerUserId, { status: orderStatus });
      
      await this.notifications.sendInAppNotification(
        delivery.order.customerId,
        'Delivery Update',
        `Your order is now ${status}`,
        'DELIVERY'
      );
    }

    return updated;
  }

  async getRiderEarnings(riderId: string, filter: string, customStartDate?: string, customEndDate?: string) {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();
    
    if (filter === 'TODAY') {
      startDate.setHours(0, 0, 0, 0);
    } else if (filter === 'WEEK') {
      startDate.setDate(today.getDate() - 7);
    } else if (filter === 'MONTH') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (filter === 'CUSTOM' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
    }

    const whereClause: any = { riderId };
    if (filter === 'CUSTOM') {
      whereClause.createdAt = { gte: startDate, lte: endDate };
    } else {
      whereClause.createdAt = { gte: startDate };
    }

    const earnings = await this.prisma.riderEarning.findMany({
      where: whereClause
    });

    const deliveriesCompleted = earnings.filter(e => e.type === 'DELIVERY').length;
    const deliveriesReturned = earnings.filter(e => e.type === 'RETURN').length;
    const totalDeliveries = earnings.length;
    
    let totalEarnings = 0;
    
    earnings.forEach(e => {
      totalEarnings += e.totalAmount || 0;
    });

    const unsubmittedCash = await this.prisma.cashCollection.aggregate({
      _sum: { amountCollected: true },
      where: { riderId, status: 'COLLECTED' }
    });
    
    const cashInHand = unsubmittedCash._sum.amountCollected || 0;

    return {
      totalDeliveries,
      deliveriesCompleted,
      deliveriesReturned,
      deliveryEarnings: totalEarnings, // for backwards compatibility
      tips: 0, // tips could be added to RiderEarning schema if requested later
      totalEarnings,
      cashInHand,
      settlementStatus: cashInHand > 0 ? 'PENDING' : 'SETTLED'
    };
  }

  async updateRiderProfile(userId: string, dto: { marketId?: string; isOnline?: boolean }) {
    let partner = await this.prisma.deliveryPartner.findUnique({ where: { userId } });
    if (!partner) {
      partner = await this.prisma.deliveryPartner.create({
        data: { userId, vehicleType: 'Bike', isOnline: dto.isOnline ?? false, marketId: dto.marketId }
      });
      
      const riderRole = await this.prisma.role.findUnique({ where: { name: 'RIDER' } });
      if (riderRole) {
        await this.prisma.user.update({ where: { id: userId }, data: { roleId: riderRole.id } });
      }

      return partner;
    }

    return this.prisma.deliveryPartner.update({
      where: { userId },
      data: dto
    });
  }
}
