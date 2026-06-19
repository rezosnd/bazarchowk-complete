import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingDto {
  @ApiProperty({ example: 'MAINTENANCE_MODE' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 'true' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({ example: 'Turned on for Diwali server upgrade' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class ToggleFeatureFlagDto {
  @ApiProperty({ example: 'NEW_PAYMENT_GATEWAY' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsNotEmpty()
  isEnabled: boolean;

  @ApiPropertyOptional({ example: 'Enables Razorpay V2 integration' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateBannerDto {
  @ApiProperty({ example: 'Diwali Mega Sale' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'https://cdn.bazarchowk.com/banners/diwali.png' })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiPropertyOptional({ example: 'https://bazarchowk.com/offers/diwali' })
  @IsString()
  @IsOptional()
  targetUrl?: string;

  @ApiPropertyOptional({ example: 'HOME_TOP' })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAppVersionDto {
  @ApiProperty({ example: 'ANDROID' })
  @IsString()
  @IsNotEmpty()
  platform: string;

  @ApiProperty({ example: '1.0.5' })
  @IsString()
  @IsNotEmpty()
  latestVersion: string;

  @ApiProperty({ example: '1.0.0' })
  @IsString()
  @IsNotEmpty()
  minVersion: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsNotEmpty()
  forceUpdate: boolean;

  @ApiProperty({ example: 'https://play.google.com/store/apps/details?id=com.bazarchowk' })
  @IsString()
  @IsNotEmpty()
  updateUrl: string;

  @ApiPropertyOptional({ example: 'Bug fixes and new features' })
  @IsString()
  @IsOptional()
  releaseNotes?: string;
}
