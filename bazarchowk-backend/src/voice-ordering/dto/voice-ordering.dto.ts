import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessVoiceOrderDto {
  @ApiPropertyOptional({ description: 'The text transcript of the user voice input' })
  @IsOptional()
  @IsString()
  transcript?: string;

  @ApiProperty({ description: 'Session ID to maintain conversation context' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiPropertyOptional({ default: 'hi-IN', description: 'Language of the transcript' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Optional Cloudinary URL of the audio file for logging' })
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiPropertyOptional({ description: 'Base64 encoded audio string from expo-av recording' })
  @IsOptional()
  @IsString()
  audioBase64?: string;
}
