import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductVariantDto {
  @ApiProperty({ example: 'APP-ORG-1KG', description: 'Unique SKU' })
  @IsString()
  sku: string;

  @ApiProperty({ example: '1 kg', description: 'Variant name/size' })
  @IsString()
  name: string;

  @ApiProperty({ example: 120.0, description: 'Price for this variant' })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ example: 50, description: 'Initial stock level' })
  @IsOptional()
  @IsNumber()
  stock?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
