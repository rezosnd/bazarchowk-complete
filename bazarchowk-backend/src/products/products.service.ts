import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async createProduct(ownerId: string, createProductDto: CreateProductDto) {
    // Verify shop ownership
    const shop = await this.prisma.shop.findUnique({ where: { id: createProductDto.shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    if (shop.ownerId !== ownerId) throw new ForbiddenException('You do not own this shop');

    const product = await this.prisma.product.create({
      data: createProductDto,
    });

    await this.notifications.sendInAppNotification(ownerId, 'Product Added', `Your product "\${product.name}" was successfully added to your catalog.`, 'SYSTEM');

    return product;
  }

  async findAll(shopId?: string, query?: string) {
    const whereClause: any = {};
    if (shopId) whereClause.shopId = shopId;
    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { searchTerms: { contains: query, mode: 'insensitive' } },
      ];
    }

    return this.prisma.product.findMany({
      where: whereClause,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        variants: true,
        category: true,
        shop: true,
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async updateProduct(id: string, ownerId: string, updateProductDto: UpdateProductDto) {
    const product = await this.findOne(id);
    if (product.shop.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this product');
    }

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  async addVariant(productId: string, ownerId: string, variantDto: CreateProductVariantDto) {
    const product = await this.findOne(productId);
    if (product.shop.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this product');
    }

    const existing = await this.prisma.productVariant.findUnique({ where: { sku: variantDto.sku } });
    if (existing) {
      throw new ConflictException('A variant with this SKU already exists');
    }

    return this.prisma.productVariant.create({
      data: {
        ...variantDto,
        productId,
      },
    });
  }

  async addImage(productId: string, ownerId: string, imageDto: CreateProductImageDto) {
    const product = await this.findOne(productId);
    if (product.shop.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this product');
    }

    if (imageDto.isPrimary) {
      // Unset previous primary images
      await this.prisma.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.productImage.create({
      data: {
        ...imageDto,
        productId,
      },
    });
  }
}
