import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { DeliveryStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async getAvailableDeliveries() {
    // In production, use PostGIS distance logic. 
    return this.prisma.delivery.findMany({
      where: { status: DeliveryStatus.UNASSIGNED },
      include: { order: { include: { shop: true, deliveryAddress: true } } },
    });
  }

  async assignDelivery(deliveryId: string, userId: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id: deliveryId }, include: { order: true } });
    if (!delivery) throw new NotFoundException('Delivery not found');
    if (delivery.status !== DeliveryStatus.UNASSIGNED) throw new BadRequestException('Delivery already assigned');

    const updatedDelivery = await this.prisma.$transaction(async (prisma) => {
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
    if (status === DeliveryStatus.IN_TRANSIT) orderStatus = OrderStatus.OUT_FOR_DELIVERY;
    if (status === DeliveryStatus.DELIVERED) orderStatus = OrderStatus.DELIVERED;

    if (orderStatus) {
      await this.prisma.order.update({
        where: { id: delivery.orderId },
        data: { status: orderStatus }
      });
      
      this.realtime.sendToUser(delivery.order.customerId, 'order_status_update', {
        orderId: delivery.orderId,
        status: orderStatus
      });

      await this.notifications.sendInAppNotification(
        delivery.order.customerId,
        'Delivery Update',
        `Your order is now ${status}`,
        'DELIVERY'
      );
    }

    return updated;
  }
}
