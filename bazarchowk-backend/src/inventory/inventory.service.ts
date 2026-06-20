import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateStockDto, InventoryLogType } from './dto/update-stock.dto';
import { SetStockDto } from './dto/set-stock.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async initializeInventory(productVariantId: string, shopId: string, initialQuantity = 0, threshold = 5) {
    const existing = await this.prisma.inventory.findUnique({ where: { productVariantId } });
    if (existing) {
      return existing;
    }

    const inventory = await this.prisma.inventory.create({
      data: {
        productVariantId,
        shopId,
        quantity: initialQuantity,
        lowStockThreshold: threshold,
      },
    });

    // Also sync with ProductVariant
    await this.prisma.productVariant.update({
      where: { id: productVariantId },
      data: { stock: initialQuantity },
    });

    return inventory;
  }

  async getInventory(inventoryId: string, ownerId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: { logs: { orderBy: { createdAt: 'desc' }, take: 10 }, shop: true },
    });

    if (!inventory) throw new NotFoundException('Inventory not found');
    if (inventory.shop.ownerId !== ownerId) throw new ForbiddenException('Not allowed');

    return inventory;
  }

  async findByShopId(shopId: string, ownerId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop || shop.ownerId !== ownerId) throw new ForbiddenException('Not allowed');

    return this.prisma.inventory.findMany({
      where: { shopId },
      include: {
        productVariant: {
          include: { product: true }
        }
      },
      orderBy: { quantity: 'asc' }
    });
  }

  async getGlobalInventory() {
    return this.prisma.inventory.findMany({
      include: {
        shop: true,
        productVariant: {
          include: { product: true }
        },
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { quantity: 'asc' }
    });
  }

  async updateStock(inventoryId: string, ownerId: string, updateDto: UpdateStockDto) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: { shop: true, productVariant: true },
    });

    if (!inventory) throw new NotFoundException('Inventory not found');
    if (inventory.shop.ownerId !== ownerId) throw new ForbiddenException('Not allowed');

    const newQuantity = inventory.quantity + updateDto.delta;
    if (newQuantity < 0) {
      throw new BadRequestException('Insufficient stock');
    }

    // Use transaction to ensure consistency
    const [updatedInventory] = await this.prisma.$transaction([
      this.prisma.inventory.update({
        where: { id: inventoryId },
        data: { quantity: newQuantity },
      }),
      this.prisma.inventoryLog.create({
        data: {
          inventoryId,
          userId: ownerId,
          type: updateDto.type,
          quantity: updateDto.delta,
          reason: updateDto.reason,
          referenceId: updateDto.referenceId,
        },
      }),
      this.prisma.productVariant.update({
        where: { id: inventory.productVariantId },
        data: { stock: newQuantity },
      }),
    ]);

    await this.checkLowStockAlert(updatedInventory);

    return updatedInventory;
  }

  async setStock(inventoryId: string, ownerId: string, setDto: SetStockDto) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: { shop: true },
    });

    if (!inventory) throw new NotFoundException('Inventory not found');
    if (inventory.shop.ownerId !== ownerId) throw new ForbiddenException('Not allowed');

    const delta = setDto.quantity - inventory.quantity;

    const [updatedInventory] = await this.prisma.$transaction([
      this.prisma.inventory.update({
        where: { id: inventoryId },
        data: { quantity: setDto.quantity },
      }),
      this.prisma.inventoryLog.create({
        data: {
          inventoryId,
          userId: ownerId,
          type: InventoryLogType.ADJUSTMENT,
          quantity: delta,
          reason: setDto.reason || 'Manual stock override',
        },
      }),
      this.prisma.productVariant.update({
        where: { id: inventory.productVariantId },
        data: { stock: setDto.quantity },
      }),
    ]);

    await this.checkLowStockAlert(updatedInventory);

    return updatedInventory;
  }

  private async checkLowStockAlert(inventory: any) {
    if (inventory.quantity <= inventory.lowStockThreshold) {
      const shop = await this.prisma.shop.findUnique({ where: { id: inventory.shopId } });
      if (shop) {
        await this.notifications.sendInAppNotification(
          shop.ownerId,
          'Low Stock Alert',
          `A product in your shop "\${shop.name}" is running low on stock (Quantity: \${inventory.quantity}).`,
          'SYSTEM'
        );
      }
    }
  }
}
