import { Injectable, BadRequestException } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class OrderStateMachineService {
  private readonly validTransitions: Record<OrderStatus, OrderStatus[]> = {
    PLACED: [OrderStatus.PAYMENT_VERIFIED, OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
    PAYMENT_VERIFIED: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
    ACCEPTED: [OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED, OrderStatus.READY],
    PREPARING: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED, OrderStatus.READY],
    READY_FOR_PICKUP: [OrderStatus.ASSIGNED_TO_RIDER, OrderStatus.CUSTOMER_PICKUP, OrderStatus.PICKED_UP, OrderStatus.DELIVERED],
    READY: [OrderStatus.ASSIGNED_TO_RIDER, OrderStatus.CUSTOMER_PICKUP, OrderStatus.READY_FOR_PICKUP, OrderStatus.PICKED_UP, OrderStatus.DELIVERED],
    ASSIGNED_TO_RIDER: [OrderStatus.PICKED_UP, OrderStatus.READY_FOR_PICKUP],
    PICKED_UP: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CUSTOMER_REFUSED],
    OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.CUSTOMER_REFUSED],
    DELIVERED: [],
    CUSTOMER_REFUSED: [OrderStatus.RETURNING_TO_SHOP, OrderStatus.RETURNED_TO_SHOP],
    RETURNING_TO_SHOP: [OrderStatus.RETURNED_TO_SHOP],
    RETURNED_TO_SHOP: [OrderStatus.INVENTORY_RESTORED, OrderStatus.REFUNDED],
    INVENTORY_RESTORED: [OrderStatus.REFUNDED],
    CUSTOMER_PICKUP: [],
    CANCELLED: [OrderStatus.REFUNDED],
    REFUNDED: [],
  };

  validateTransition(currentStatus: OrderStatus, newStatus: OrderStatus, role: string) {
    if (currentStatus === newStatus) return true;
    
    const allowedNext = this.validTransitions[currentStatus];
    if (!allowedNext || !allowedNext.includes(newStatus)) {
      throw new BadRequestException(`Invalid order state transition from ${currentStatus} to ${newStatus}`);
    }

    // Strict Role-based transitions
    if (newStatus === OrderStatus.DELIVERED && role !== 'ADMIN' && role !== 'DELIVERY_PARTNER' && role !== 'RIDER' && role !== 'SUPER_ADMIN' && role !== 'SHOP_OWNER') {
      throw new BadRequestException('Only riders, shop owners, or admins can mark an order as delivered');
    }
    
    if (newStatus === OrderStatus.PAYMENT_VERIFIED && role !== 'SYSTEM' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      throw new BadRequestException('Only the system can verify payments');
    }

    if (newStatus === OrderStatus.CUSTOMER_REFUSED && role !== 'DELIVERY_PARTNER' && role !== 'RIDER' && role !== 'ADMIN') {
      throw new BadRequestException('Only riders or admins can mark an order as customer refused');
    }

    if (newStatus === OrderStatus.INVENTORY_RESTORED && role !== 'SYSTEM' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      throw new BadRequestException('Only the backend system can restore inventory automatically');
    }

    return true;
  }

  validatePaymentStatus(currentPaymentStatus: PaymentStatus, newPaymentStatus: PaymentStatus, role: string) {
    if (currentPaymentStatus === newPaymentStatus) return true;
    
    if (newPaymentStatus === PaymentStatus.PAID && role !== 'SYSTEM' && role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'RIDER' && role !== 'DELIVERY_PARTNER' && role !== 'SHOP_OWNER') {
      throw new BadRequestException('Frontend applications cannot arbitrarily mark an order as PAID. Payment verification must happen through the gateway webhook or system.');
    }

    return true;
  }
}
