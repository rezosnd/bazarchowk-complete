import { Test, TestingModule } from '@nestjs/testing';
import { CommissionService } from './commission.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CommissionService', () => {
  let service: CommissionService;
  let prisma: PrismaService;
  let notifications: NotificationsService;

  const mockPrismaService = {
    commissionRule: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    commission: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
    revenueLedger: { createMany: jest.fn(), create: jest.fn(), findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn(), aggregate: jest.fn() },
    shop: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const mockNotificationsService = {
    sendInAppNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<CommissionService>(CommissionService);
    prisma = module.get<PrismaService>(PrismaService);
    notifications = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveRule', () => {
    it('should throw BadRequestException if no rule exists at all', async () => {
      mockPrismaService.commissionRule.findFirst.mockResolvedValue(null);
      await expect(service.resolveRule('shop1')).rejects.toThrow(BadRequestException);
    });

    it('should return shop specific rule if available', async () => {
      const mockRule = { id: 'r1', scope: 'SHOP', shopId: 'shop1' };
      mockPrismaService.commissionRule.findFirst.mockResolvedValueOnce(mockRule);
      
      const result = await service.resolveRule('shop1');
      expect(result).toEqual(mockRule);
    });
  });

  describe('calculateAndRecord', () => {
    it('should calculate and run transaction correctly', async () => {
      const dto = { orderId: 'order1', shopId: 'shop1', orderAmount: 1000 };
      
      mockPrismaService.commission.findUnique.mockResolvedValue(null);
      mockPrismaService.shop.findUnique.mockResolvedValue({ id: 'shop1', city: 'dhanbad' });
      mockPrismaService.commissionRule.findFirst.mockResolvedValue({
        id: 'rule1',
        commissionPercent: 10,
        platformFeePercent: 2,
        deliveryFeeFixed: 40,
      });

      // Mock the transaction callback directly
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      mockPrismaService.commission.create.mockResolvedValue({ id: 'comm1' });
      mockPrismaService.revenueLedger.createMany.mockResolvedValue({ count: 3 });

      const result = await service.calculateAndRecord(dto);
      expect(result).toEqual({ id: 'comm1' });
      expect(mockPrismaService.revenueLedger.createMany).toHaveBeenCalled();
    });
  });
});
