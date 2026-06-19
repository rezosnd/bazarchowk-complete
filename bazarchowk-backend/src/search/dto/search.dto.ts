import { IsString, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SearchType {
  ALL = 'ALL',
  PRODUCTS = 'PRODUCTS',
  SHOPS = 'SHOPS',
  SERVICES = 'SERVICES',
}

export class SearchQueryDto {
  @ApiProperty({ description: 'Search keywords' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ enum: SearchType, default: SearchType.ALL })
  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType;

  @ApiPropertyOptional({ description: 'Filter by city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Filter by latitude', type: Number })
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Filter by longitude', type: Number })
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Radius in km if lat/lon provided', default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  radius?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  offset?: number;
}
