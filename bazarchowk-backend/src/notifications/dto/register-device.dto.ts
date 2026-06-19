import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({ description: 'Firebase Cloud Messaging (FCM) Token' })
  @IsString()
  token: string;

  @ApiPropertyOptional({ description: 'Device OS: ios, android, web' })
  @IsOptional()
  @IsString()
  deviceOs?: string;
}
