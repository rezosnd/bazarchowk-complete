import { IsString, IsNumber, IsBoolean, Min, Max, Matches, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateShopTimingDto {
  @ApiProperty({ description: 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)', minimum: 0, maximum: 6 })
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '09:00', description: 'Opening time (HH:mm format)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'openTime must be in HH:mm format' })
  openTime: string;

  @ApiProperty({ example: '21:00', description: 'Closing time (HH:mm format)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'closeTime must be in HH:mm format' })
  closeTime: string;

  @ApiPropertyOptional({ default: false, description: 'Set true if shop is closed this entire day of the week (e.g. closed on Sundays)' })
  @IsBoolean()
  @IsOptional()
  isClosed?: boolean;
}

export class BulkUpdateTimingsDto {
  @ApiProperty({ type: [CreateShopTimingDto], description: 'Array of all 7 days timings. Partner sets opening, closing, or isClosed for each day.' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateShopTimingDto)
  timings: CreateShopTimingDto[];
}

export class CreateShopHolidayDto {
  @ApiProperty({ example: '2026-10-24', description: 'The specific date the shop will be closed (ISO 8601 date string)' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 'Diwali', description: 'Optional reason for closure shown to customers' })
  @IsOptional()
  @IsString()
  reason?: string;
}
