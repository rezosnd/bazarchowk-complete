import { IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RedeemPointsDto {
  @ApiProperty({ description: 'Number of points to redeem for wallet cash' })
  @IsNumber()
  @IsPositive()
  points: number;
}
