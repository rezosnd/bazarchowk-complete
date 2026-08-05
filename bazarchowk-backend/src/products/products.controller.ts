import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query, Delete } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SHOP_OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product (Shop Owner only)' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  create(@Body() createProductDto: CreateProductDto, @CurrentUser() user: any) {
    return this.productsService.createProduct(user.id, createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'Search and list products' })
  @ApiQuery({ name: 'shopId', required: false })
  @ApiQuery({ name: 'query', required: false, description: 'Search keywords' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'subCategoryId', required: false })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lng', required: false })
  findAll(
    @Query('shopId') shopId?: string, 
    @Query('query') query?: string,
    @Query('categoryId') categoryId?: string,
    @Query('subCategoryId') subCategoryId?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('city') city?: string,
  ) {
    return this.productsService.findAll(shopId, query, categoryId, subCategoryId, lat ? parseFloat(lat) : undefined, lng ? parseFloat(lng) : undefined, city);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific product' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SHOP_OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product (Shop Owner only)' })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto, @CurrentUser() user: any) {
    return this.productsService.updateProduct(id, user.id, updateProductDto);
  }

  @Post(':id/variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SHOP_OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a variant to a product' })
  addVariant(@Param('id') id: string, @Body() variantDto: CreateProductVariantDto, @CurrentUser() user: any) {
    return this.productsService.addVariant(id, user.id, variantDto);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SHOP_OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an image to a product' })
  addImage(@Param('id') id: string, @Body() imageDto: CreateProductImageDto, @CurrentUser() user: any) {
    return this.productsService.addImage(id, user.id, imageDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SHOP_OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product (Shop Owner only)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.removeProduct(id, user.id);
  }
}
