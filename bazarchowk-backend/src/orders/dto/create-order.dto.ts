import { IsEnum, IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreateOrderDto {
  @ApiProperty({ description: 'ID of the Shop to place the order from' })
  @IsString()
  shopId: string;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.COD })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ description: 'ID of the delivery address (required for HOME_DELIVERY)' })
  @IsOptional()
  @IsString()
  deliveryAddressId?: string;

  @ApiPropertyOptional({ description: 'Idempotency key to prevent duplicate orders (UUID)' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ description: 'Whether to use wallet balance for partial or full payment' })
  @IsOptional()
  @IsBoolean()
  useWallet?: boolean;

  @ApiPropertyOptional({ enum: ['DELIVERY', 'SELF_PICKUP'], default: 'DELIVERY', description: 'Delivery method: DELIVERY or SELF_PICKUP' })
  @IsOptional()
  @IsIn(['DELIVERY', 'SELF_PICKUP'])
  deliveryType?: 'DELIVERY' | 'SELF_PICKUP';
}
