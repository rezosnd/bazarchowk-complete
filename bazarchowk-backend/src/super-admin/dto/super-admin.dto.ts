import { IsOptional, IsString, IsInt, Min, IsBoolean, IsUUID, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class ShopFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  verified?: boolean;
}

export class FraudFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  resolved?: boolean;
}

export class RevenueFilterDto {
  @ApiProperty({ description: 'Start date in ISO format' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date in ISO format' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ enum: ['day', 'month'], default: 'day' })
  @IsOptional()
  @IsEnum(['day', 'month'])
  groupBy?: 'day' | 'month' = 'day';
}

export class CreateMarketDto {
  @ApiProperty()
  @IsUUID()
  villageId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ default: 5.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radiusKm?: number;
}

export class UpdateMarketDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateCityConfigDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  state: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  defaultDeliveryFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minOrderAmount?: number;
}

export class AssignRoleDto {
  @ApiProperty({ description: 'The role name to assign (e.g. SUPER_ADMIN, DISTRICT_ADMIN, MARKET_ADMIN, CUSTOMER)' })
  @IsString()
  roleName: string;
}
