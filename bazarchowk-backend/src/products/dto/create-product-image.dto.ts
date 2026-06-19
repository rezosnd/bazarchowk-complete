import { IsString, IsBoolean, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductImageDto {
  @ApiProperty({ description: 'URL of the product image' })
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional({ description: 'Set to true if this is the main image', default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
