import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PaymentMethod, PaymentStatus, OrderStatus, TransactionType, TransactionReason } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // Generate a random unique order number
  private generateOrderNumber(): string {
    return 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  async checkoutPreview(customerId: string, dto: { shopId: string, deliveryAddressId: string, useWallet?: boolean }) {
    const [cart, deliveryAddress] = await Promise.all([
      this.prisma.cart.findUnique({
        where: { userId: customerId },
        include: { items: { include: { productVariant: { include: { product: true } } } } }
      }),
      this.prisma.address.findUnique({ where: { id: dto.deliveryAddressId } })
    ]);

    if (!deliveryAddress || deliveryAddress.userId !== customerId) throw new BadRequestException('Invalid address');
    if (!cart || cart.items.length === 0) throw new BadRequestException('Cart is empty');

    const shopItems = cart.items.filter(item => item.productVariant.product.shopId === dto.shopId);
    if (shopItems.length === 0) throw new BadRequestException('No items for this shop');

    let itemTotal = 0;
    for (const item of shopItems) {
      if (item.productVariant.stock < item.quantity) throw new BadRequestException(`Insufficient stock for ${item.productVariant.name}`);
      itemTotal += (item.productVariant.price * item.quantity);
    }

    const shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId } });
    if (!shop) throw new NotFoundException('Shop not found');

    // Only compute distance if BOTH shop and address have valid non-zero coordinates
    const shopHasCoords = shop.latitude && shop.longitude && (shop.latitude !== 0 || shop.longitude !== 0);
    const addrHasCoords = deliveryAddress.latitude && deliveryAddress.longitude && (deliveryAddress.latitude !== 0 || deliveryAddress.longitude !== 0);

    let distanceKm = 0;
    if (shopHasCoords && addrHasCoords) {
      const R = 6371;
      const dLat = (shop.latitude - deliveryAddress.latitude) * (Math.PI / 180);
      const dLon = (shop.longitude - deliveryAddress.longitude) * (Math.PI / 180);
      const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(deliveryAddress.latitude*Math.PI/180)*Math.cos(shop.latitude*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      distanceKm = R * c;
    }

    const cityConfig = await this.prisma.cityConfig.findFirst({ where: { name: { equals: shop.city, mode: 'insensitive' } } });

    // Default to city's configured base fee, or ₹0 hardcoded fallback
    let deliveryFee = cityConfig?.defaultDeliveryFee ?? 0;

    if (cityConfig?.distanceFeeTiers && Array.isArray(cityConfig.distanceFeeTiers) && distanceKm > 0) {
      // Apply distance-tier pricing only when we have a real distance
      const tiers = [...(cityConfig.distanceFeeTiers as any[])].sort((a: any, b: any) => a.uptoKm - b.uptoKm);
      for (const tier of tiers) {
        if (distanceKm <= tier.uptoKm) { deliveryFee = tier.fee; break; }
      }
    }
    // If city is unconfigured, delivery fee remains ₹0.

    let taxAmount = 0;
    if (cityConfig && cityConfig.taxPercent) {
      taxAmount = (itemTotal * cityConfig.taxPercent) / 100;
    } else {
      taxAmount = (itemTotal * 5) / 100;
    }

    const totalAmount = itemTotal + taxAmount + deliveryFee;

    let walletBalance = 0;
    let walletAmountUsed = 0;
    
    const userWallet = await this.prisma.wallet.findUnique({ where: { userId: customerId } });
    if (userWallet) walletBalance = userWallet.balance;

    if (dto.useWallet && walletBalance > 0) {
      walletAmountUsed = walletBalance >= totalAmount ? totalAmount : walletBalance;
    }

    return {
      itemTotal,
      taxAmount,
      deliveryFee,
      totalAmount,
      walletBalance,
      walletAmountUsed,
      payableAmount: totalAmount - walletAmountUsed,
      distanceKm: parseFloat(distanceKm.toFixed(1))
    };
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
        throw new BadRequestException(`Insufficient stock for ${item.productVariant.name}`);
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

    // Only compute distance if BOTH shop and address have valid non-zero coordinates
    const shopHasCoords = shop.latitude && shop.longitude && (shop.latitude !== 0 || shop.longitude !== 0);
    const addrHasCoords = deliveryAddress.latitude && deliveryAddress.longitude && (deliveryAddress.latitude !== 0 || deliveryAddress.longitude !== 0);

    let distanceKm = 0;
    if (shopHasCoords && addrHasCoords) {
      const R = 6371; // Earth's radius in km
      const dLat = (shop.latitude - deliveryAddress.latitude) * (Math.PI / 180);
      const dLon = (shop.longitude - deliveryAddress.longitude) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deliveryAddress.latitude * (Math.PI / 180)) * Math.cos(shop.latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceKm = R * c;
    }

    // 4. Resolve Dynamic Delivery Fee from City Config (configured by Admin)
    const cityConfig = await this.prisma.cityConfig.findFirst({
      where: { name: { equals: shop.city, mode: 'insensitive' } }
    });

    let calculatedDeliveryFee = cityConfig?.defaultDeliveryFee ?? 0;

    if (cityConfig?.distanceFeeTiers && Array.isArray(cityConfig.distanceFeeTiers) && distanceKm > 0) {
      // Tiers should be sorted by uptoKm, but let's sort them just to be safe
      const tiers = [...(cityConfig.distanceFeeTiers as any[])].sort((a: any, b: any) => a.uptoKm - b.uptoKm);
      for (const tier of tiers) {
        if (distanceKm <= tier.uptoKm) {
          calculatedDeliveryFee = tier.fee;
          break;
        }
      }
    }

    let taxAmount = 0;
    if (cityConfig && cityConfig.taxPercent) {
      taxAmount = (totalAmount * cityConfig.taxPercent) / 100;
    } else {
      taxAmount = (totalAmount * 5) / 100; // 5% default
    }

    const subtotal = totalAmount;
    totalAmount = subtotal + taxAmount + calculatedDeliveryFee;

    // Check Wallet Balance if WALLET is selected or useWallet is true
    let walletAmountUsed = 0;
    let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
    let paymentMethod = createDto.paymentMethod;

    if (createDto.useWallet || paymentMethod === 'WALLET') {
      const userWallet = await this.prisma.wallet.findUnique({ where: { userId: customerId } });
      if (userWallet && userWallet.balance > 0) {
        // If the balance covers the entire order
        if (userWallet.balance >= totalAmount) {
          walletAmountUsed = totalAmount;
          paymentMethod = 'WALLET'; // Force to wallet since it's fully covered
          paymentStatus = PaymentStatus.PAID;
        } else {
          // Partial payment
          if (paymentMethod === 'WALLET') {
            throw new BadRequestException('Insufficient wallet balance to fully pay for this order. Please select another payment method for the remainder.');
          }
          walletAmountUsed = userWallet.balance;
        }
      } else if (paymentMethod === 'WALLET') {
        throw new BadRequestException('Insufficient wallet balance to place this order.');
      }
    }

    // 5. Create Order via Transaction
    const orderNumber = this.generateOrderNumber();

    const order = (await this.prisma.$transaction(async (prisma) => {
      // If paying by wallet, deduct now
      if (paymentMethod === 'WALLET' && walletAmountUsed > 0) {
        const wallet = await prisma.wallet.findUnique({ where: { userId: customerId } });
        if (!wallet || wallet.balance < walletAmountUsed) throw new BadRequestException('Insufficient wallet balance during transaction.');
        
        await prisma.wallet.update({
          where: { userId: customerId },
          data: { balance: { decrement: walletAmountUsed } }
        });
        
        await prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'DEBIT',
            amount: walletAmountUsed,
            reason: 'PURCHASE',
            description: `Payment for order ${orderNumber}`,
            referenceId: orderNumber,
            balanceAfter: wallet.balance - walletAmountUsed
          }
        });
      }

      // Create Order
      const newOrder = await prisma.order.create({
        data: {
          orderNumber,
          customerId,
          shopId: createDto.shopId,
          deliveryAddressId: createDto.deliveryAddressId,
          paymentMethod,
          paymentStatus,
          status: OrderStatus.PLACED,
          subtotal,
          taxAmount,
          deliveryFee: calculatedDeliveryFee,
          walletAmountUsed,
          totalAmount,
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
            type: TransactionType.DEBIT,
            amount: totalAmount,
            reason: TransactionReason.PURCHASE,
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
    })) as any;

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

    // Send Order Invoice Email to Customer (non-blocking)
    if (order.customer?.email) {
      const invoiceItems = shopItems.map(item => ({
        name: item.productVariant.product?.name || item.productVariant.name || 'Item',
        qty: item.quantity,
        price: item.productVariant.price * item.quantity,
      }));
      this.emailService.sendOrderInvoice(
        order.customer.email,
        order.customer.firstName || 'Customer',
        order.orderNumber,
        invoiceItems,
        order.totalAmount
      ).catch(e => console.error('Order invoice email failed:', e.message));
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
        delivery: true,
        rider: { select: { id: true, firstName: true, lastName: true, phone: true, deliveryPartner: { select: { vehicleType: true } } } },
        items: { include: { productVariant: true } },
        statusHistory: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateOrderStatus(orderId: string, userId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { shop: true, rider: true } });
    if (!order) throw new NotFoundException('Order not found');

    const userObj = await this.prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!userObj) throw new NotFoundException('User not found');

    const isAdmin = userObj.role?.name === 'ADMIN';
    const isOwner = order.shop.ownerId === userId;
    const isAssignedRider = order.riderId === userId;

    if (!isAdmin && !isOwner && !isAssignedRider) {
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
        `Your order ${order.orderNumber} is now ${dto.status}`,
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
