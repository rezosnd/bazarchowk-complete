import { IsString, IsOptional, IsBoolean, IsNumber, Min, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FeeTierDto {
  @IsNumber()
  uptoKm: number;

  @IsNumber()
  fee: number;
}

export class CreateCityDto {
  @ApiProperty({ example: 'Dhanbad' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Jharkhand' })
  @IsString()
  state: string;

  @ApiProperty({ example: 'dhanbad' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ default: 20.0 })
  @IsOptional()
  @IsNumber()
  defaultDeliveryFee?: number;

  @ApiPropertyOptional({ default: 99.0 })
  @IsOptional()
  @IsNumber()
  minOrderAmount?: number;

  @ApiPropertyOptional({ default: 2.0, description: 'Platform fee in percent' })
  @IsOptional()
  @IsNumber()
  platformFeePercent?: number;

  @ApiPropertyOptional({ default: 5.0, description: 'GST tax percent' })
  @IsOptional()
  @IsNumber()
  taxPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ default: 30.0 })
  @IsOptional()
  @IsNumber()
  radiusKm?: number;

  @ApiPropertyOptional({ example: 'en,hi', description: 'Comma-separated language codes' })
  @IsOptional()
  @IsString()
  languages?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeTierDto)
  distanceFeeTiers?: FeeTierDto[];
}

export class UpdateCityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isLaunched?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  defaultDeliveryFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minOrderAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  platformFeePercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  taxPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeTierDto)
  distanceFeeTiers?: FeeTierDto[];
}

export class CreateRegionalPromotionDto {
  @ApiProperty({ example: 'Dhanbad Launch Offer' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['PERCENT', 'FLAT'] })
  @IsString()
  discountType: string;

  @ApiProperty({ example: 20 })
  @IsNumber()
  discountValue: number;

  @ApiPropertyOptional({ example: 'DHANBAD20' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minOrderAmt?: number;

  @ApiPropertyOptional()
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  endDate?: Date;
}
