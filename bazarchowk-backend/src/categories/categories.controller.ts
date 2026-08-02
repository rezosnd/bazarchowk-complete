import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) { }

  @Get()
  @ApiOperation({ summary: 'Get all categories with subcategories (optionally filtered by city)' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  findAllCategories(@Query('city') city?: string) {
    return this.categoriesService.findAllCategories(city);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single category by ID' })
  findAllCategory(@Param('id') id: string) {
    return this.categoriesService.findCategory(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category (Admin only)' })
  @ApiResponse({ status: 201, description: 'Category created' })
  createCategory(@Body() createCategoryDto: CreateCategoryDto, @CurrentUser() user: any) {
    return this.categoriesService.createCategory(createCategoryDto, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category (Admin only)' })
  updateCategory(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto, @CurrentUser() user: any) {
    return this.categoriesService.updateCategory(id, updateCategoryDto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a category (Admin only)' })
  removeCategory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.categoriesService.removeCategory(id, user.id);
  }

  // --- Subcategories ---

  @Post('sub')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a subcategory (Admin only)' })
  createSubCategory(@Body() createSubCategoryDto: CreateSubCategoryDto, @CurrentUser() user: any) {
    return this.categoriesService.createSubCategory(createSubCategoryDto, user.id);
  }

  @Patch('sub/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a subcategory (Admin only)' })
  updateSubCategory(@Param('id') id: string, @Body() updateSubCategoryDto: UpdateSubCategoryDto, @CurrentUser() user: any) {
    return this.categoriesService.updateSubCategory(id, updateSubCategoryDto, user.id);
  }

  @Delete('sub/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a subcategory (Admin only)' })
  removeSubCategory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.categoriesService.removeSubCategory(id, user.id);
  }
}
