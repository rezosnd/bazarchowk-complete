import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async createCategory(createCategoryDto: CreateCategoryDto, adminId?: string) {
    const existing = await this.prisma.category.findUnique({
      where: { name: createCategoryDto.name },
    });
    if (existing) {
      throw new ConflictException('Category with this name already exists');
    }
    const category = await this.prisma.category.create({ data: createCategoryDto });
    if (adminId) {
      await this.notificationsService.sendInAppNotification(adminId, 'Category Created', `Category "${category.name}" was added.`, 'SYSTEM');
    }
    await this.cacheManager.del('all_categories_v2');
    return category;
  }

  async findAllCategories(city?: string) {
    // Always return ALL active categories regardless of whether they have products.
    // When the database is fresh / products are being added, categories must still
    // appear so partners can assign them during onboarding.
    const cacheKey = 'all_categories_v2';
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      include: { subCategories: { where: { isActive: true }, orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    });

    await this.cacheManager.set(cacheKey, categories, 300000); // Cache for 5 min
    return categories;
  }

  async findCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { subCategories: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto, adminId?: string) {
    await this.findCategory(id); // Ensure exists
    if (updateCategoryDto.name) {
      const existing = await this.prisma.category.findUnique({
        where: { name: updateCategoryDto.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Category with this name already exists');
      }
    }
    const updated = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
    if (adminId) {
      await this.notificationsService.sendInAppNotification(adminId, 'Category Updated', `Category "${updated.name}" was modified.`, 'SYSTEM');
    }
    await this.cacheManager.del('all_categories_v2');
    return updated;
  }

  async removeCategory(id: string, adminId?: string) {
    const category = await this.findCategory(id);
    await this.prisma.category.delete({ where: { id } });
    if (adminId) {
      await this.notificationsService.sendInAppNotification(adminId, 'Category Deleted', `Category "${category.name}" was removed.`, 'SYSTEM');
    }
    await this.cacheManager.del('all_categories_v2');
    return { message: 'Category deleted successfully' };
  }

  // --- SubCategories ---

  async createSubCategory(createSubCategoryDto: CreateSubCategoryDto, adminId?: string) {
    await this.findCategory(createSubCategoryDto.categoryId); // Ensure category exists
    const existing = await this.prisma.subCategory.findUnique({
      where: {
        categoryId_name: {
          categoryId: createSubCategoryDto.categoryId,
          name: createSubCategoryDto.name,
        },
      },
    });
    if (existing) {
      throw new ConflictException('Subcategory with this name already exists in this category');
    }
    const subCategory = await this.prisma.subCategory.create({ data: createSubCategoryDto });
    if (adminId) {
      await this.notificationsService.sendInAppNotification(adminId, 'SubCategory Created', `SubCategory "${subCategory.name}" was added.`, 'SYSTEM');
    }
    await this.cacheManager.del('all_categories_v2');
    return subCategory;
  }

  findAllSubCategories(categoryId: string) {
    return this.prisma.subCategory.findMany({
      where: { categoryId },
      orderBy: { name: 'asc' },
    });
  }

  async findSubCategory(id: string) {
    const subCategory = await this.prisma.subCategory.findUnique({
      where: { id },
    });
    if (!subCategory) throw new NotFoundException('SubCategory not found');
    return subCategory;
  }

  async updateSubCategory(id: string, updateSubCategoryDto: UpdateSubCategoryDto, adminId?: string) {
    const subCategory = await this.findSubCategory(id);
    if (updateSubCategoryDto.name || updateSubCategoryDto.categoryId) {
      const categoryId = updateSubCategoryDto.categoryId || subCategory.categoryId;
      const name = updateSubCategoryDto.name || subCategory.name;
      
      const existing = await this.prisma.subCategory.findUnique({
        where: { categoryId_name: { categoryId, name } },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Subcategory with this name already exists in this category');
      }
    }

    const updated = await this.prisma.subCategory.update({
      where: { id },
      data: updateSubCategoryDto,
    });
    if (adminId) {
      await this.notificationsService.sendInAppNotification(adminId, 'SubCategory Updated', `SubCategory "${updated.name}" was modified.`, 'SYSTEM');
    }
    await this.cacheManager.del('all_categories_v2');
    return updated;
  }

  async removeSubCategory(id: string, adminId?: string) {
    const subCategory = await this.findSubCategory(id);
    await this.prisma.subCategory.delete({ where: { id } });
    if (adminId) {
      await this.notificationsService.sendInAppNotification(adminId, 'SubCategory Deleted', `SubCategory "${subCategory.name}" was removed.`, 'SYSTEM');
    }
    await this.cacheManager.del('all_categories_v2');
    return { message: 'SubCategory deleted successfully' };
  }
}
