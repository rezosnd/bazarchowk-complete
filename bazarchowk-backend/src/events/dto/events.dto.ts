export class OrderEventPayload {
  orderId: string;
  customerId: string;
  status: string;
  shopId?: string;
  totalAmount?: number;
}

export class PaymentEventPayload {
  paymentId: string;
  orderId: string;
  amount: number;
  status: string; // 'SUCCESS', 'FAILED', 'REFUNDED'
}

export class AppointmentEventPayload {
  appointmentId: string;
  providerId: string;
  customerId: string;
  status: string;
}

export class NotificationEventPayload {
  userId: string;
  title: string;
  body: string;
  type: string;
}
