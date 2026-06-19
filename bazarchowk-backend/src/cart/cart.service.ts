import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: { include: { shop: true, images: { where: { isPrimary: true } } } } },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: { items: { include: { productVariant: { include: { product: { include: { shop: true, images: true } } } } } } },
      });
    }

    return cart;
  }

  async addToCart(userId: string, dto: AddToCartDto) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: dto.productVariantId } });
    if (!variant) throw new NotFoundException('Product variant not found');
    if (!variant.isActive) throw new BadRequestException('Product is currently unavailable');

    const cart = await this.getCart(userId);

    // Check existing item
    const existingItem = await this.prisma.cartItem.findUnique({
      where: { cartId_productVariantId: { cartId: cart.id, productVariantId: dto.productVariantId } },
    });

    const newQuantity = existingItem ? existingItem.quantity + dto.quantity : dto.quantity;
    
    // Validate stock
    if (variant.stock < newQuantity) {
      throw new BadRequestException(`Only \${variant.stock} items left in stock`);
    }

    if (existingItem) {
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productVariantId: dto.productVariantId,
        quantity: dto.quantity,
      },
    });
  }

  async updateQuantity(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.getCart(userId);
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { productVariant: true },
    });

    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Cart item not found');
    }

    if (item.productVariant.stock < dto.quantity) {
      throw new BadRequestException(`Only \${item.productVariant.stock} items left in stock`);
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getCart(userId);
    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });

    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Cart item not found');
    }

    return this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  async clearCart(userId: string) {
    const cart = await this.getCart(userId);
    return this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
}
