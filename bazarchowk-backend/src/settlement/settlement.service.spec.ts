import { Test, TestingModule } from '@nestjs/testing';
import { SettlementService } from './settlement.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('SettlementService', () => {
  let service: SettlementService;
  let prisma: PrismaService;
  let notifications: NotificationsService;

  const mockPrismaService = {
    order: { findUnique: jest.fn(), findMany: jest.fn() },
    cashCollection: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), aggregate: jest.fn(), updateMany: jest.fn() },
    riderDeposit: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    shopSettlement: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
  };

  const mockNotificationsService = {
    sendInAppNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<SettlementService>(SettlementService);
    prisma = module.get<PrismaService>(PrismaService);
    notifications = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordCashCollection', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);
      await expect(service.recordCashCollection('rider1', { orderId: 'order1', amountCollected: 100 }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if order is not COD', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({ paymentMethod: 'UPI' });
      await expect(service.recordCashCollection('rider1', { orderId: 'order1', amountCollected: 100 }))
        .rejects.toThrow(BadRequestException);
    });

    it('should record cash successfully', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({ 
        paymentMethod: 'COD', status: 'DELIVERED', riderId: 'rider1' 
      });
      mockPrismaService.cashCollection.findUnique.mockResolvedValue(null);
      mockPrismaService.cashCollection.create.mockResolvedValue({ id: 'coll1' });

      const result = await service.recordCashCollection('rider1', { orderId: 'order1', amountCollected: 100 });
      expect(result).toEqual({ id: 'coll1' });
    });
  });
});
