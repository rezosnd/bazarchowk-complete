import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
    private readonly auditService: AuditService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // Generate a random unique order number
  private generateOrderNumber(): string {
    return 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  async createOrder(customerId: string, createDto: CreateOrderDto) {
    if (createDto.idempotencyKey) {
      const cacheKey = `order_idempotency_${createDto.idempotencyKey}`;
      const existingOrderId = await this.cacheManager.get(cacheKey);
      if (existingOrderId) {
        throw new BadRequestException('Order already being processed or completed');
      }
      await this.cacheManager.set(cacheKey, 'PROCESSING', 60000); // 1 minute lock
    }
    // 1. Fetch Cart and Address
    const [cart, deliveryAddress] = await Promise.all([
      this.prisma.cart.findUnique({
        where: { userId: customerId },
        include: { items: { include: { productVariant: { include: { product: true } } } } }
      }),
      this.prisma.address.findUnique({
        where: { id: createDto.deliveryAddressId }
      })
    ]);

    if (!deliveryAddress || deliveryAddress.userId !== customerId) {
      throw new BadRequestException('Invalid delivery address');
    }

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    // Filter items belonging to the requested shopId
    const shopItems = cart.items.filter(item => item.productVariant.product.shopId === createDto.shopId);
    if (shopItems.length === 0) {
      throw new BadRequestException('No items in your cart from this shop');
    }

    let totalAmount = 0;
    const orderItemsData: any[] = [];

    // 2. Validate Stock & Calculate Total
    for (const item of shopItems) {
      if (item.productVariant.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for \${item.productVariant.name}`);
      }
      totalAmount += (item.productVariant.price * item.quantity);
      
      orderItemsData.push({
        productVariantId: item.productVariant.id,
        quantity: item.quantity,
        priceAtTime: item.productVariant.price,
      });
    }

    // 3. Calculate Haversine Distance for Delivery Fee
    const shop = await this.prisma.shop.findUnique({
      where: { id: createDto.shopId }
    });

    if (!shop) throw new NotFoundException('Shop not found');

    const R = 6371; // Earth's radius in km
    const dLat = (shop.latitude - deliveryAddress.latitude) * (Math.PI / 180);
    const dLon = (shop.longitude - deliveryAddress.longitude) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deliveryAddress.latitude * (Math.PI / 180)) * Math.cos(shop.latitude * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    // 4. Resolve Dynamic Delivery Fee based on distance tiers configured by Super Admin
    let calculatedDeliveryFee = 20; // Hard fallback
    const rule = await this.prisma.deliveryRule.findFirst({
      where: { OR: [{ marketId: shop.marketId || undefined }, { marketId: 'DEFAULT_MARKET' }] },
      orderBy: { marketId: 'desc' } // Prioritize specific market over default
    });

    if (rule) {
      if (distanceKm <= rule.tier1MaxKm) {
        calculatedDeliveryFee = rule.tier1Fee;
      } else if (distanceKm <= rule.tier2MaxKm) {
        calculatedDeliveryFee = rule.tier2Fee;
      } else if (distanceKm <= rule.tier3MaxKm) {
        calculatedDeliveryFee = rule.tier3Fee;
      } else {
        // Beyond tier 3, add base + extra per km
        calculatedDeliveryFee = rule.tier3Fee + Math.ceil(distanceKm - rule.tier3MaxKm) * 10;
      }
    } else {
      calculatedDeliveryFee = Math.max(20, Math.ceil(distanceKm) * 5); // Fallback if no rule
    }

    // Add Delivery Fee to total
    totalAmount += calculatedDeliveryFee;

    // 5. Create Order via Transaction
    const orderNumber = this.generateOrderNumber();

    const order = await this.prisma.$transaction(async (prisma) => {
      // Create Order
      const newOrder = await prisma.order.create({
        data: {
          orderNumber,
          customerId,
          shopId: createDto.shopId,
          deliveryAddressId: createDto.deliveryAddressId,
          paymentMethod: createDto.paymentMethod,
          paymentStatus: createDto.paymentMethod === 'WALLET' ? PaymentStatus.PAID : PaymentStatus.PENDING,
          status: OrderStatus.PLACED,
          totalAmount,
          deliveryFee: calculatedDeliveryFee,
          items: {
            create: orderItemsData,
          },
          statusHistory: {
            create: {
              status: OrderStatus.PLACED,
              notes: 'Order placed by customer',
              createdBy: customerId,
            }
          }
        },
        include: { shop: true, customer: true }
      });

      if (createDto.paymentMethod === 'WALLET') {
        const wallet = await prisma.wallet.findUnique({ where: { userId: customerId } });
        if (!wallet || wallet.balance < totalAmount) {
          throw new BadRequestException('Insufficient wallet balance');
        }
        const updatedWallet = await prisma.wallet.update({
          where: { userId: customerId },
          data: { balance: { decrement: totalAmount } }
        });
        await prisma.walletTransaction.create({
          data: {
            walletId: updatedWallet.id,
            type: 'DEBIT',
            amount: totalAmount,
            reason: 'PURCHASE',
            description: `Payment for order ${orderNumber}`,
            referenceId: newOrder.id,
            balanceAfter: updatedWallet.balance,
          }
        });
      }

      // Update Inventory & Clear Cart Items
      for (const item of shopItems) {
        // Decrease stock
        await prisma.productVariant.update({
          where: { id: item.productVariantId },
          data: { stock: { decrement: item.quantity } }
        });
        
        // Log inventory
        const inventory = await prisma.inventory.findUnique({ where: { productVariantId: item.productVariantId } });
        if (inventory) {
          await prisma.inventory.update({
            where: { id: inventory.id },
            data: { quantity: { decrement: item.quantity } }
          });
          await prisma.inventoryLog.create({
            data: {
              inventoryId: inventory.id,
              userId: customerId,
              type: 'SALE',
              quantity: -item.quantity,
              reason: 'Order placed',
              referenceId: newOrder.id,
            }
          });
        }

        // Delete from cart
        await prisma.cartItem.delete({ where: { id: item.id } });
      }

      return newOrder;
    });

    // 4. Send Notifications
    // To Shop Owner
    await this.notifications.sendInAppNotification(
      order.shop.ownerId,
      'New Order Received',
      `You have a new order (${order.orderNumber}) for ₹${order.totalAmount}`,
      'ORDER'
    );

    // To Customer
    await this.notifications.sendInAppNotification(
      customerId,
      'Order Placed Successfully',
      `Your order (${order.orderNumber}) for ₹${order.totalAmount} has been placed.`,
      'ORDER'
    );

    // Realtime broadcast to the specific shop's connected devices
    this.realtime.sendToShop(order.shopId, 'new_order', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount
    });

    // Realtime broadcast to admins for global dashboard
    this.realtime.sendToAdmins('new_platform_order', {
      orderId: order.id,
      shopId: order.shopId,
      totalAmount: order.totalAmount,
      timestamp: new Date()
    });

    if (createDto.idempotencyKey) {
      await this.cacheManager.set(`order_idempotency_${createDto.idempotencyKey}`, order.id, 86400000); // lock for 24h
    }

    return order;
  }

  async getCustomerOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: { shop: true, items: { include: { productVariant: true } }, statusHistory: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getShopOrders(shopId: string, ownerId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop || shop.ownerId !== ownerId) {
      throw new ForbiddenException('Not authorized to view these orders');
    }

    return this.prisma.order.findMany({
      where: { shopId },
      include: { customer: true, items: { include: { productVariant: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAllOrders() {
    return this.prisma.order.findMany({
      include: { shop: true, customer: true, items: { include: { productVariant: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  async getOrderById(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        shop: true, 
        customer: true, 
        deliveryAddress: true,
        items: { include: { productVariant: true } },
        statusHistory: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateOrderStatus(orderId: string, userId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { shop: true } });
    if (!order) throw new NotFoundException('Order not found');

    // Need to make sure the user is allowed to update this order (Shop Owner or Rider or Admin). 
    // We will assume for now if they are the shop owner, they can update.
    if (order.shop.ownerId !== userId) {
      // In a real app, also check if user.role.name === 'ADMIN' or 'RIDER'
      throw new ForbiddenException('Not authorized to update this order');
    }

    const data: any = {};
    if (dto.paymentStatus) data.paymentStatus = dto.paymentStatus;
    if (dto.status) data.status = dto.status;

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data,
    });

    if (dto.status && dto.status !== order.status) {
      await this.prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: dto.status,
          notes: dto.notes,
          createdBy: userId,
        }
      });

      // Audit Log
      await this.auditService.logAction({
        actorId: userId,
        action: 'UPDATE_ORDER_STATUS',
        entity: 'Order',
        entityId: orderId,
        newValue: JSON.stringify({ status: dto.status }),
        ipAddress: 'System',
      });

      // If the shop just ACCEPTED the order, push it to the Delivery Queue!
      if (dto.status === OrderStatus.ACCEPTED) {
        // Ensure we don't create duplicate delivery rows if they toggle status
        const existingDelivery = await this.prisma.delivery.findUnique({ where: { orderId } });
        if (!existingDelivery) {
          const newDel = await this.prisma.delivery.create({
            data: { orderId } // status defaults to UNASSIGNED
          });
          
          // Alert nearby riders (within 8km)
          const onlineRiders = await this.prisma.deliveryPartner.findMany({
            where: { isOnline: true, currentLatitude: { not: null }, currentLongitude: { not: null } }
          });

          const shopLat = order.shop.latitude;
          const shopLng = order.shop.longitude;
          let notifiedCount = 0;

          for (const rider of onlineRiders) {
            if (!rider.currentLatitude || !rider.currentLongitude) continue;

            const R = 6371; // Earth's radius in km
            const dLat = (rider.currentLatitude - shopLat) * (Math.PI / 180);
            const dLon = (rider.currentLongitude - shopLng) * (Math.PI / 180);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(shopLat * (Math.PI / 180)) * Math.cos(rider.currentLatitude * (Math.PI / 180)) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            if (distance <= 8) {
              await this.notifications.sendInAppNotification(
                rider.userId,
                'New Delivery Nearby!',
                `An order is ready for pickup near you (${distance.toFixed(1)} km away).`,
                'DELIVERY'
              );
              this.realtime.sendToUser(rider.userId, 'new_delivery', {
                deliveryId: newDel.id,
                orderId: newDel.orderId
              });
              notifiedCount++;
            }
          }

          if (notifiedCount === 0) {
            // Fallback: Alert all available riders if nobody is nearby
            this.realtime.sendToAllRiders('new_delivery', {
              deliveryId: newDel.id,
              orderId: newDel.orderId
            });
          }
        }
      }

      // Notify customer
      await this.notifications.sendInAppNotification(
        order.customerId,
        'Order Update',
        `Your order \${order.orderNumber} is now \${dto.status}`,
        'ORDER'
      );

      // Realtime websocket broadcast
      this.realtime.sendToUser(order.customerId, 'order_status_update', {
        orderId: order.id,
        status: dto.status
      });
    }

    return updated;
  }
}
