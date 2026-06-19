import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '@prisma/client';

export class CreateCouponDto {
  @ApiProperty({ example: 'SUMMER50' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({ example: 50 })
  @IsNumber()
  discountValue: number;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  maxDiscount?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsNumber()
  @IsOptional()
  minOrderValue?: number;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-06-30T23:59:59.000Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: 1000 })
  @IsNumber()
  @IsOptional()
  usageLimit?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  perUserLimit?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'shop-uuid-here' })
  @IsString()
  @IsOptional()
  shopId?: string;
}

export class ApplyCouponDto {
  @ApiProperty({ example: 'SUMMER50' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 600 })
  @IsNumber()
  @IsNotEmpty()
  cartTotal: number;

  @ApiPropertyOptional({ example: 'shop-uuid-here' })
  @IsString()
  @IsOptional()
  shopId?: string;
}
