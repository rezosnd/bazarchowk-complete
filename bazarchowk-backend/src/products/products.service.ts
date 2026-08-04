import { Injectable, Inject, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
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
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async createProduct(ownerId: string, createProductDto: CreateProductDto) {
    // Verify shop ownership
    const shop = await this.prisma.shop.findUnique({ where: { id: createProductDto.shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    if (shop.ownerId !== ownerId) throw new ForbiddenException('You do not own this shop');

    const product = await this.prisma.product.create({
      data: createProductDto,
    });

    await this.notifications.sendInAppNotification(ownerId, 'Product Added', `Your product "${product.name}" was successfully added to your catalog.`, 'SYSTEM');

    return product;
  }

  async findAll(shopId?: string, query?: string, categoryId?: string, subCategoryId?: string, lat?: number, lng?: number) {
    const cacheKey = `products_all_${shopId || 'none'}_${query || 'none'}_${categoryId || 'none'}_${subCategoryId || 'none'}_${lat?.toFixed(2) || 'none'}_${lng?.toFixed(2) || 'none'}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const whereClause: any = { isPublished: true };
    if (shopId) whereClause.shopId = shopId;
    if (categoryId) whereClause.categoryId = categoryId;
    if (subCategoryId) whereClause.subCategoryId = subCategoryId;
    if (query) {
      const tsQuery = query.trim().split(/\s+/).join(' & ');
      whereClause.OR = [
        { name: { search: tsQuery } },
        { description: { search: tsQuery } },
        { searchTerms: { search: tsQuery } },
      ];
    }

    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng) && !shopId) {
      // Find all active, verified shops that have location data
      const allShops = await this.prisma.shop.findMany({
        where: { isActive: true, isVerified: true },
        select: { id: true, latitude: true, longitude: true, deliveryRadius: true }
      });

      const shopsWithLocation = allShops.filter(s => s.latitude != null && s.longitude != null);

      if (shopsWithLocation.length > 0) {
        // Only filter by location if shops actually have GPS data
        const nearbyShopIds = shopsWithLocation.filter(shop => {
          const R = 6371;
          const dLat = (shop.latitude - lat) * (Math.PI / 180);
          const dLon = (shop.longitude - lng) * (Math.PI / 180);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat * (Math.PI / 180)) * Math.cos(shop.latitude * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;
          return distance <= (shop.deliveryRadius || 10.0);
        }).map(s => s.id);

        // Also include shops that have NO coordinates set (treat as local/unverified)
        const shopsWithoutLocation = allShops
          .filter(s => s.latitude == null || s.longitude == null)
          .map(s => s.id);

        const combinedIds = [...nearbyShopIds, ...shopsWithoutLocation];
        if (combinedIds.length > 0) {
          whereClause.shopId = { in: combinedIds };
        }
        // If combinedIds is empty (no nearby shops + no location-less shops), don't add shopId filter
        // This means: show all products (better UX than showing nothing)
      }
      // If no shops have location data at all, skip location filtering entirely
    }

    const products = await this.prisma.product.findMany({
      where: whereClause,
      include: {
        shop: { select: { name: true, city: true, latitude: true, longitude: true, deliveryRadius: true } },
        category: { select: { name: true } },
        images: { orderBy: { isPrimary: 'desc' }, take: 1 },
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    await this.cacheManager.set(cacheKey, products, 60000);
    return products;
  }

  async findOne(id: string) {
    const cacheKey = `product_detail_${id}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

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
    
    await this.cacheManager.set(cacheKey, product, 60000);
    return product;
  }

  async updateProduct(id: string, ownerId: string, updateProductDto: UpdateProductDto) {
    const product = await this.findOne(id);
    if (product.shop.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this product');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
    await this.cacheManager.del(`product_detail_${id}`);
    return updated;
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

  async removeProduct(productId: string, ownerId: string) {
    const product = await this.findOne(productId);
    if (product.shop.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this product');
    }

    await this.prisma.product.delete({
      where: { id: productId },
    });
    
    await this.cacheManager.del(`product_detail_${productId}`);
    return { success: true, message: 'Product deleted' };
  }
}
