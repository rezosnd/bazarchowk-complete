import { IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddFundsDto {
  @ApiProperty({ description: 'Amount to add to wallet', minimum: 1 })
  @IsNumber()
  @IsPositive()
  amount: number;
}
