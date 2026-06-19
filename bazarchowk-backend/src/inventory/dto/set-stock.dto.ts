import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetStockDto {
  @ApiProperty({ description: 'Exact quantity to set stock to' })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ description: 'Optional reason for the setting stock' })
  @IsOptional()
  @IsString()
  reason?: string;
}
