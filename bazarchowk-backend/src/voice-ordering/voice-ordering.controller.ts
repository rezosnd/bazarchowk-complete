import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { VoiceOrderingService } from './voice-ordering.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ProcessVoiceOrderDto } from './dto/voice-ordering.dto';

@ApiTags('Voice Ordering (AI) (Module 15)')
@Controller('voice-ordering')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VoiceOrderingController {
  constructor(private readonly voiceService: VoiceOrderingService) {}

  @Post('process')
  @ApiOperation({ summary: 'Conversational Voice Ordering AI via GPT-4' })
  @ApiBody({ type: ProcessVoiceOrderDto })
  processVoiceOrder(
    @Body() dto: ProcessVoiceOrderDto,
    @CurrentUser() user: any
  ) {
    return this.voiceService.processConversationalVoiceOrder(user.id, dto.transcript, dto.sessionId, dto.language, dto.audioUrl);
  }
}
