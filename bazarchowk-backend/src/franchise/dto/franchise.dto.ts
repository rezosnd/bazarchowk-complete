import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDistrictAdminDto {
  @ApiProperty({ description: 'User ID to promote as District Admin' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'Dhanbad District' })
  @IsString()
  districtName: string;

  @ApiProperty({ example: 'Jharkhand' })
  @IsString()
  state: string;
}

export class CreateMarketAdminDto {
  @ApiProperty({ description: 'User ID to promote as Market Admin' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'Dhanbad City Market' })
  @IsString()
  marketName: string;

  @ApiProperty({ example: 'Covers Hirapur, Bank More, Saraidhela' })
  @IsString()
  coverageArea: string;

  @ApiPropertyOptional({ description: 'Optional District Admin ID to assign this market admin under' })
  @IsOptional()
  @IsString()
  districtAdminId?: string;
}

export class AssignTerritoryDto {
  @ApiProperty({ example: 'dhanbad' })
  @IsString()
  citySlug: string;

  @ApiProperty({ example: 'Bank More Market' })
  @IsString()
  marketArea: string;

  @ApiPropertyOptional({ example: 23.7996 })
  @IsOptional()
  @IsNumber()
  centerLat?: number;

  @ApiPropertyOptional({ example: 86.4304 })
  @IsOptional()
  @IsNumber()
  centerLon?: number;

  @ApiPropertyOptional({ default: 5.0 })
  @IsOptional()
  @IsNumber()
  radiusKm?: number;
}

export class UpdatePermissionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canVerifyShops?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canManageRiders?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewRevenue?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canSettlePayments?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canManageAds?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canBanUsers?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canViewFraudLogs?: boolean;
}
