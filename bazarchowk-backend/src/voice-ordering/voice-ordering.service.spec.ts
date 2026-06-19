import { Test, TestingModule } from '@nestjs/testing';
import { VoiceOrderingService } from './voice-ordering.service';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { OrdersService } from '../orders/orders.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { GeminiService } from '../gemini/gemini.service';
import { BadRequestException } from '@nestjs/common';

describe('VoiceOrderingService', () => {
  let service: VoiceOrderingService;
  let geminiService: GeminiService;

  const mockPrismaService = {
    voiceOrderLog: { findMany: jest.fn(), create: jest.fn() },
    shop: { findFirst: jest.fn() },
    provider: { findFirst: jest.fn() },
    serviceOffering: { findFirst: jest.fn() },
    timeSlot: { findFirst: jest.fn() },
    product: { findFirst: jest.fn() },
    cart: { findUnique: jest.fn() },
    address: { findFirst: jest.fn() },
    productVariant: { findUnique: jest.fn() },
  };

  const mockCartService = { addToCart: jest.fn(), removeItem: jest.fn() };
  const mockOrdersService = { createOrder: jest.fn() };
  const mockAppointmentsService = { bookAppointment: jest.fn() };
  const mockGeminiService = { processVoiceAssistant: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceOrderingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CartService, useValue: mockCartService },
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: AppointmentsService, useValue: mockAppointmentsService },
        { provide: GeminiService, useValue: mockGeminiService },
      ],
    }).compile();

    service = module.get<VoiceOrderingService>(VoiceOrderingService);
    geminiService = module.get<GeminiService>(GeminiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processConversationalVoiceOrder', () => {
    it('should throw BadRequestException if transcript is empty', async () => {
      await expect(service.processConversationalVoiceOrder('u1', '', 'sess1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should successfully parse intent and process AI output', async () => {
      mockPrismaService.voiceOrderLog.findMany.mockResolvedValue([]);
      mockPrismaService.voiceOrderLog.create.mockResolvedValue({ id: 'log1' });

      // Mock Gemini response for Grocery
      const mockAiResponseText = JSON.stringify({
        aiVoiceReply: "Pyaaz add ho gaya",
        intent: "GROCERY",
        action: "ADD_TO_CART",
        shopName: "Gupta Store",
        items: [{ searchTerm: "Onion", quantity: 1, unit: "kg" }]
      });

      mockGeminiService.processVoiceAssistant.mockResolvedValue(mockAiResponseText);

      // Mock DB for Grocery checkout
      mockPrismaService.shop.findFirst.mockResolvedValue({ id: 's1', name: 'Gupta Store' });
      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 'p1', name: 'Onion', shopId: 's1', variants: [{ id: 'v1', price: 50 }]
      });

      const result = await service.processConversationalVoiceOrder('u1', '1 kg pyaaz', 'sess1');
      
      expect(result.action).toBe('ADD_TO_CART');
      expect(result.shopSelected).toBe('Gupta Store');
      expect(mockCartService.addToCart).toHaveBeenCalledWith('u1', { productVariantId: 'v1', quantity: 1 });
    });
  });
});
