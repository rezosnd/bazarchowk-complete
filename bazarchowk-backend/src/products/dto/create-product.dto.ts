import { IsString, IsNumber, IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'Shop ID this product belongs to' })
  @IsUUID()
  shopId: string;

  @ApiProperty({ description: 'Category ID' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ description: 'SubCategory ID' })
  @IsOptional()
  @IsUUID()
  subCategoryId?: string;

  @ApiProperty({ example: 'Organic Apples' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Fresh organic apples sourced from local farms' })
  @IsString()
  description: string;

  @ApiProperty({ example: 120.0 })
  @IsNumber()
  basePrice: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'Keywords for search indexing' })
  @IsOptional()
  @IsString()
  searchTerms?: string;
}
