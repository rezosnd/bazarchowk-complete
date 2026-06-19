import { IsString, IsOptional, IsBoolean, IsUrl, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubCategoryDto {
  @ApiProperty({ description: 'The ID of the parent category' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'Vegetables', description: 'Name of the subcategory' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the subcategory' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Icon URL' })
  @IsOptional()
  @IsUrl()
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'Image URL' })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Is the subcategory active?' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
