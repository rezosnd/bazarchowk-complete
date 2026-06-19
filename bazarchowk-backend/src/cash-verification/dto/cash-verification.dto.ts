import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitCashDto {
  @ApiProperty({ description: 'The actual physical cash amount the rider is depositing' })
  @IsNumber()
  @Min(0)
  submittedAmount: number;

  @ApiPropertyOptional({ description: 'Optional note from rider' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class VerifyCashDto {
  @ApiProperty({ description: 'The exact cash counted by the admin' })
  @IsNumber()
  @Min(0)
  verifiedAmount: number;
}
