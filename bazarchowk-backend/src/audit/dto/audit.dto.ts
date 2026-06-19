import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditLogDto {
  @ApiProperty({ example: 'ORDER_STATUS_UPDATE' })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiProperty({ example: 'Order' })
  @IsString()
  @IsNotEmpty()
  entity: string;

  @ApiProperty({ example: 'order-uuid-here' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiPropertyOptional({ example: 'admin-uuid-here' })
  @IsString()
  @IsOptional()
  actorId?: string;

  @ApiPropertyOptional({ example: '{"status": "PREPARING"}' })
  @IsString()
  @IsOptional()
  oldValue?: string;

  @ApiPropertyOptional({ example: '{"status": "READY"}' })
  @IsString()
  @IsOptional()
  newValue?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  userAgent?: string;
}
