import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // Generate a random unique order number
  private generateOrderNumber(): string {
    return 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  async createOrder(customerId: string, createDto: CreateOrderDto) {
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

    // 3. Create Order via Transaction
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
            reason: 'ORDER_PAYMENT',
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
    await this.notifications.sendInAppNotification(
      order.shop.ownerId,
      'New Order Received',
      `You have a new order (${order.orderNumber}) for ₹${order.totalAmount}`,
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

      // If the shop just ACCEPTED the order, push it to the Delivery Queue!
      if (dto.status === OrderStatus.ACCEPTED) {
        // Ensure we don't create duplicate delivery rows if they toggle status
        const existingDelivery = await this.prisma.delivery.findUnique({ where: { orderId } });
        if (!existingDelivery) {
          const newDel = await this.prisma.delivery.create({
            data: { orderId } // status defaults to UNASSIGNED
          });
          // Alert all available riders
          this.realtime.sendToAllRiders('new_delivery', {
            deliveryId: newDel.id,
            orderId: newDel.orderId
          });
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
