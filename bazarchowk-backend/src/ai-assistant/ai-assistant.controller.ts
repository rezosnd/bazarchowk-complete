import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('AI Assistant & Support')
@Controller('ai-assistant')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiAssistantController {
  constructor(private readonly aiService: AiAssistantService) {}

  @Post('ticket')
  @ApiOperation({ summary: 'Create a new AI support ticket' })
  createTicket(
    @Body() dto: { subject: string; category: string; message: string },
    @CurrentUser() user: any
  ) {
    return this.aiService.createTicket(user.id, dto.subject, dto.category, dto.message);
  }

  @Post('ticket/:id/message')
  @ApiOperation({ summary: 'Send a message to the AI in an existing ticket' })
  sendMessage(
    @Param('id') ticketId: string,
    @Body('message') message: string,
    @CurrentUser() user: any
  ) {
    return this.aiService.processSupportMessage(user.id, ticketId, message);
  }
}
