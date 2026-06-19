import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ example: 'Order not delivered' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: 'ORDER_ISSUE' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ example: 'I ordered 2 kgs of potato but got only 1 kg.' })
  @IsString()
  @IsOptional()
  initialMessage?: string;
}

export class AddMessageDto {
  @ApiProperty({ example: 'Please process my refund immediately.' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: TicketStatus })
  @IsEnum(TicketStatus)
  status: TicketStatus;
}
