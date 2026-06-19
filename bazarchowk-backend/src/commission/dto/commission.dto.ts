import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommissionRuleDto {
  @ApiProperty({ example: 'Dhanbad Food Shops - 8%' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ['GLOBAL', 'CITY', 'CATEGORY', 'SHOP'] })
  @IsEnum(['GLOBAL', 'CITY', 'CATEGORY', 'SHOP'])
  scope: string;

  @ApiPropertyOptional({ example: 'dhanbad' })
  @IsOptional()
  @IsString()
  citySlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiProperty({ example: 5.0, description: 'Commission % of order value' })
  @IsNumber()
  @Min(0)
  @Max(50)
  commissionPercent: number;

  @ApiProperty({ example: 20.0, description: 'Fixed delivery fee INR' })
  @IsNumber()
  @Min(0)
  deliveryFeeFixed: number;

  @ApiProperty({ example: 2.0, description: 'Platform convenience fee %' })
  @IsNumber()
  @Min(0)
  @Max(10)
  platformFeePercent: number;

  @ApiPropertyOptional({ example: 100.0 })
  @IsOptional()
  @IsNumber()
  featuredShopDailyRate?: number;

  @ApiPropertyOptional({ example: 50.0 })
  @IsOptional()
  @IsNumber()
  featuredProductDailyRate?: number;
}

export class CalculateCommissionDto {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiProperty()
  @IsString()
  shopId: string;

  @ApiProperty()
  @IsNumber()
  orderAmount: number;

  @ApiPropertyOptional({ description: 'If not provided, best-matching rule is auto-selected' })
  @IsOptional()
  @IsString()
  ruleId?: string;
}

export class RevenueReportQueryDto {
  @ApiProperty({ description: 'ISO date string' })
  @IsString()
  startDate: string;

  @ApiProperty({ description: 'ISO date string' })
  @IsString()
  endDate: string;

  @ApiPropertyOptional({ enum: ['GLOBAL', 'CITY', 'SHOP'] })
  @IsOptional()
  @IsEnum(['GLOBAL', 'CITY', 'SHOP'])
  groupBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  citySlug?: string;
}
