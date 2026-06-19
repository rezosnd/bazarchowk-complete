import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(userId: string, dto: CreateReviewDto) {
    if (!dto.shopId && !dto.productId) {
      throw new BadRequestException('Must provide either shopId or productId');
    }
    if (dto.shopId && dto.productId) {
      throw new BadRequestException('Cannot provide both shopId and productId in the same review');
    }

    // Security/Production quality: Ensure user has actually purchased from this shop or bought this product
    if (dto.shopId) {
      const shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId } });
      if (!shop) throw new NotFoundException('Shop not found');

      // Check if user has a completed order from this shop
      const hasOrdered = await this.prisma.order.findFirst({
        where: {
          customerId: userId,
          shopId: dto.shopId,
          status: OrderStatus.DELIVERED,
        },
      });

      if (!hasOrdered) {
        throw new ForbiddenException('You must receive an order from this shop before reviewing it');
      }

      // Check if already reviewed this shop
      const existingReview = await this.prisma.review.findFirst({
        where: { userId, shopId: dto.shopId }
      });
      if (existingReview) {
         throw new BadRequestException('You have already reviewed this shop');
      }
    }

    if (dto.productId) {
      const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
      if (!product) throw new NotFoundException('Product not found');

      // Check if user has a completed order containing this product
      const hasOrdered = await this.prisma.orderItem.findFirst({
        where: {
          productVariant: { productId: dto.productId },
          order: { customerId: userId, status: OrderStatus.DELIVERED },
        },
      });

      if (!hasOrdered) {
        throw new ForbiddenException('You must purchase this product before reviewing it');
      }

      const existingReview = await this.prisma.review.findFirst({
        where: { userId, productId: dto.productId }
      });
      if (existingReview) {
         throw new BadRequestException('You have already reviewed this product');
      }
    }

    return this.prisma.review.create({
      data: {
        userId,
        shopId: dto.shopId,
        productId: dto.productId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  async getShopReviews(shopId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { shopId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const averageRating = reviews.length > 0 
      ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length 
      : 0;

    return { averageRating, totalReviews: reviews.length, reviews };
  }

  async getProductReviews(productId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { productId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const averageRating = reviews.length > 0 
      ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length 
      : 0;

    return { averageRating, totalReviews: reviews.length, reviews };
  }
}
