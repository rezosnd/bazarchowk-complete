import { IsString, IsNotEmpty, IsOptional, IsInt, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'ID of the service offering (e.g., Haircut)' })
  @IsString()
  @IsNotEmpty()
  serviceOfferingId: string;

  @ApiProperty({ description: 'ID of the provider (e.g., Stylist or Doctor)' })
  @IsString()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty({ description: 'ID of the chosen time slot' })
  @IsString()
  @IsNotEmpty()
  timeSlotId: string;

  @ApiPropertyOptional({ description: 'Optional notes for the provider' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTimeSlotDto {
  @ApiProperty({ description: 'Start time of the slot (ISO8601)', example: '2026-06-20T10:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'End time of the slot (ISO8601)', example: '2026-06-20T11:00:00.000Z' })
  @IsDateString()
  endTime: string;

  @ApiProperty({
    description: 'Max customers allowed in this slot. e.g. 1 = exclusive, 3 = 3 customers can book same slot',
    default: 1,
    minimum: 1,
    maximum: 50,
  })
  @IsInt()
  @Min(1)
  @Max(50)
  maxCapacity: number;
}

export class UpdateSlotCapacityDto {
  @ApiProperty({
    description: 'New max customer capacity for this time slot',
    minimum: 1,
    maximum: 50,
  })
  @IsInt()
  @Min(1)
  @Max(50)
  maxCapacity: number;
}
