import { IsString, IsOptional, IsEnum, IsArray, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ConversationType {
  P2P = 'P2P',
  GROUP = 'GROUP',
  SHOP_CUSTOMER = 'SHOP_CUSTOMER',
  RIDER_CUSTOMER = 'RIDER_CUSTOMER',
  SUPPORT = 'SUPPORT',
  BROADCAST = 'BROADCAST',
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  SYSTEM = 'SYSTEM',
}

export class CreateConversationDto {
  @ApiProperty({ enum: ConversationType })
  @IsEnum(ConversationType)
  type: ConversationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty({ type: [String], description: 'List of participant user IDs to add initially' })
  @IsArray()
  @IsString({ each: true })
  participantIds: string[];
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  conversationId: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: MessageType, default: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @ApiPropertyOptional({ type: [String], description: 'URLs of uploaded attachments' })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  attachmentUrls?: string[];
}

export class BroadcastMessageDto {
  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ description: 'Role to broadcast to, e.g. CUSTOMER, DELIVERY_PARTNER' })
  @IsString()
  targetRole: string;
}
