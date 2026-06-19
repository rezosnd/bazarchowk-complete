import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum InventoryLogType {
  RESTOCK = 'RESTOCK',
  SALE = 'SALE',
  RETURN = 'RETURN',
  ADJUSTMENT = 'ADJUSTMENT',
  DAMAGED = 'DAMAGED',
}

export class UpdateStockDto {
  @ApiProperty({ description: 'Amount to change (positive for restock, negative for sale/damaged)' })
  @IsNumber()
  delta: number;

  @ApiProperty({ enum: InventoryLogType, description: 'Type of inventory change' })
  @IsEnum(InventoryLogType)
  type: InventoryLogType;

  @ApiPropertyOptional({ description: 'Optional reason for the adjustment' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Optional reference ID (like Order ID)' })
  @IsOptional()
  @IsString()
  referenceId?: string;
}
