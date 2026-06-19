import { IsString, IsNumber, IsOptional, IsEnum, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordExpenseDto {
  @ApiProperty({ enum: ['MARKETING', 'SALARY', 'SERVER', 'LEGAL', 'MISC'] })
  @IsEnum(['MARKETING', 'SALARY', 'SERVER', 'LEGAL', 'MISC'])
  category: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'ISO date string' })
  @IsDateString()
  date: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptUrl?: string;
}

export class RecordTransactionDto {
  @ApiProperty()
  @IsString()
  transactionId: string;

  @ApiProperty({ enum: ['CREDIT', 'DEBIT'] })
  @IsEnum(['CREDIT', 'DEBIT'])
  type: string;

  @ApiProperty({ enum: ['UPI', 'BANK_TRANSFER', 'CASH'] })
  @IsEnum(['UPI', 'BANK_TRANSFER', 'CASH'])
  method: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: ['PENDING', 'SUCCESS', 'FAILED'] })
  @IsEnum(['PENDING', 'SUCCESS', 'FAILED'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceType?: string;
}

export class FinanceReportQueryDto {
  @ApiProperty({ description: 'ISO date string' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'ISO date string' })
  @IsDateString()
  endDate: string;
}
