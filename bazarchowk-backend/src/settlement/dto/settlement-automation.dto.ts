import { IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SettlementFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export class GenerateSettlementBatchDto {
  @ApiProperty({ enum: SettlementFrequency, description: 'Frequency type of the settlement batch' })
  @IsEnum(SettlementFrequency)
  frequency: SettlementFrequency;

  @ApiProperty({ description: 'Start date of the settlement period (ISO 8601 string)' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ description: 'End date of the settlement period (ISO 8601 string)' })
  @IsDateString()
  periodEnd: string;
}
