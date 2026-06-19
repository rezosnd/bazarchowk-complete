import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ description: 'The internal Order ID to pay for' })
  @IsString()
  @IsNotEmpty()
  orderId: string;
}
