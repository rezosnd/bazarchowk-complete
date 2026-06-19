import { IsInt, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiPropertyOptional({ description: 'ID of the shop being reviewed' })
  @ValidateIf(o => !o.productId)
  @IsString()
  shopId?: string;

  @ApiPropertyOptional({ description: 'ID of the product being reviewed' })
  @ValidateIf(o => !o.shopId)
  @IsString()
  productId?: string;

  @ApiProperty({ description: 'Rating from 1 to 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Optional text review' })
  @IsOptional()
  @IsString()
  comment?: string;
}
