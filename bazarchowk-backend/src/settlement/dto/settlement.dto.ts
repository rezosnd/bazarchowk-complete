import { IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordCashCollectionDto {
  @ApiProperty({ description: 'The COD order ID for which cash was collected' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Exact cash amount collected from customer' })
  @IsNumber()
  @Min(0)
  amountCollected: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SubmitRiderDepositDto {
  @ApiProperty({ description: 'Array of CashCollection IDs to include in this deposit' })
  collectionIds: string[];

  @ApiProperty({ description: 'Total cash amount being submitted' })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiPropertyOptional({ description: 'URL of receipt/handover photo uploaded to Cloudinary' })
  @IsOptional()
  @IsString()
  receiptImageUrl?: string;
}

export class VerifyDepositDto {
  @ApiProperty({ enum: ['VERIFIED', 'REJECTED'] })
  @IsEnum(['VERIFIED', 'REJECTED'])
  status: 'VERIFIED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Required if status is REJECTED' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class CreateSettlementDto {
  @ApiProperty({ description: 'Shop ID to settle' })
  @IsString()
  shopId: string;

  @ApiProperty({ description: 'Period start date (ISO string)' })
  @IsString()
  periodStart: string;

  @ApiProperty({ description: 'Period end date (ISO string)' })
  @IsString()
  periodEnd: string;

  @ApiPropertyOptional({ default: 5, description: 'Platform commission percentage' })
  @IsOptional()
  @IsNumber()
  commissionPercent?: number;
}

export class MarkSettlementPaidDto {
  @ApiProperty({ description: 'Bank transfer reference or UPI transaction ID' })
  @IsString()
  paymentReference: string;
}
