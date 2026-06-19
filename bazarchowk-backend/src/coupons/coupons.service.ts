import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto, ApplyCouponDto } from './dto/coupon.dto';
import { DiscountType } from '@prisma/client';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async createCoupon(dto: CreateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({ where: { code: dto.code.toUpperCase() } });
    if (existing) throw new BadRequestException('Coupon code already exists');

    return this.prisma.coupon.create({
      data: {
        code: dto.code.toUpperCase(),
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxDiscount: dto.maxDiscount,
        minOrderValue: dto.minOrderValue || 0,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        usageLimit: dto.usageLimit,
        perUserLimit: dto.perUserLimit || 1,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        shopId: dto.shopId,
      }
    });
  }

  async getAllCoupons(shopId?: string) {
    const where = shopId ? { shopId } : {};
    return this.prisma.coupon.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async applyCoupon(userId: string, dto: ApplyCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: dto.code.toUpperCase() } });

    if (!coupon) throw new NotFoundException('Invalid coupon code');
    if (!coupon.isActive) throw new BadRequestException('Coupon is disabled');

    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      throw new BadRequestException('Coupon is expired or not yet active');
    }

    if (coupon.shopId && dto.shopId && coupon.shopId !== dto.shopId) {
      throw new BadRequestException('Coupon is not applicable to this shop');
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    if (dto.cartTotal < coupon.minOrderValue) {
      throw new BadRequestException(`Minimum order value to use this coupon is ${coupon.minOrderValue}`);
    }

    // Check user limit
    // In a full production system, we'd check how many times the user used this coupon in orders.
    // For now, we assume valid if reaching here, but real production would query Order table where couponCode = dto.code and userId = userId.

    let discountAmount = 0;

    if (coupon.discountType === DiscountType.FLAT) {
      discountAmount = coupon.discountValue;
    } else if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = dto.cartTotal * (coupon.discountValue / 100);
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else if (coupon.discountType === DiscountType.FREE_DELIVERY) {
      // Logic for free delivery handled by client mapping this response
      discountAmount = 0; // The client sets delivery fee to 0 based on the response type
    }

    return {
      success: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountAmount: discountAmount,
      finalTotal: dto.cartTotal - discountAmount > 0 ? dto.cartTotal - discountAmount : 0,
      message: 'Coupon applied successfully'
    };
  }
}
