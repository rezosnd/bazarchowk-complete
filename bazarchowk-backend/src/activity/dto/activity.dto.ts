import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordLoginDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  userAgent?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  deviceOs?: string;
}

export class RecordSearchDto {
  @ApiProperty({ example: 'fresh tomatoes' })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({ example: '{"category": "vegetables"}' })
  @IsString()
  @IsOptional()
  filters?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsNumber()
  @IsOptional()
  results?: number;
}

export class RecordActivityDto {
  @ApiProperty({ example: 'VIEWED_PRODUCT' })
  @IsString()
  @IsNotEmpty()
  actionType: string;

  @ApiPropertyOptional({ example: 'product-uuid-here' })
  @IsString()
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional({ example: '{"timeSpent": "12s"}' })
  @IsString()
  @IsOptional()
  metadata?: string;
}
