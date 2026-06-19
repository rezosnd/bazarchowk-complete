import { Test, TestingModule } from '@nestjs/testing';
import { FranchiseService } from './franchise.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('FranchiseService', () => {
  let service: FranchiseService;
  let prisma: PrismaService;
  let notifications: NotificationsService;

  const mockPrismaService = {
    user: { findUnique: jest.fn() },
    districtAdmin: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    marketAdmin: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    adminMarket: { upsert: jest.fn(), findMany: jest.fn() },
    adminPermission: { findFirst: jest.fn(), update: jest.fn() },
    order: { aggregate: jest.fn() },
    shop: { count: jest.fn() },
    riderDeposit: { aggregate: jest.fn() },
  };

  const mockNotificationsService = {
    sendInAppNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FranchiseService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<FranchiseService>(FranchiseService);
    prisma = module.get<PrismaService>(PrismaService);
    notifications = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDistrictAdmin', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.createDistrictAdmin({ userId: 'u1', districtName: 'Dhanbad', state: 'JH' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is already a district admin', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u1' });
      mockPrismaService.districtAdmin.findUnique.mockResolvedValue({ id: 'da1' });
      await expect(service.createDistrictAdmin({ userId: 'u1', districtName: 'Dhanbad', state: 'JH' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should create District Admin and send notification', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u1' });
      mockPrismaService.districtAdmin.findUnique.mockResolvedValue(null);
      mockPrismaService.districtAdmin.create.mockResolvedValue({ id: 'da1' });

      const result = await service.createDistrictAdmin({ userId: 'u1', districtName: 'Dhanbad', state: 'JH' });
      expect(result).toEqual({ id: 'da1' });
      expect(mockNotificationsService.sendInAppNotification).toHaveBeenCalled();
    });
  });
});
