import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreateOrderDto {
  @ApiProperty({ description: 'ID of the Shop to place the order from' })
  @IsString()
  shopId: string;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.COD })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'ID of the delivery address' })
  @IsString()
  deliveryAddressId: string;

  @ApiPropertyOptional({ description: 'Idempotency key to prevent duplicate orders (UUID)' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
