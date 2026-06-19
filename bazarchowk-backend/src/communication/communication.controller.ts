import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CommunicationService } from './communication.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateConversationDto, SendMessageDto, BroadcastMessageDto } from './dto/communication.dto';

@ApiTags('Communication Hub')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('communication')
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation (P2P, Group, Support)' })
  createConversation(@CurrentUser() user: any, @Body() dto: CreateConversationDto) {
    return this.communicationService.createConversation(user.id, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all active conversations for the current user' })
  getUserConversations(@CurrentUser() user: any) {
    return this.communicationService.getUserConversations(user.id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get paginated messages for a specific conversation' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMessages(
    @CurrentUser() user: any,
    @Param('id') conversationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.communicationService.getMessages(conversationId, user.id, Number(page || 1), Number(limit || 50));
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a message to a conversation via REST API (fallback for Socket.IO)' })
  sendMessage(@CurrentUser() user: any, @Body() dto: SendMessageDto) {
    return this.communicationService.saveMessage(user.id, dto);
  }

  @Post('broadcast')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Broadcast a system message to a specific role' })
  broadcastMessage(@CurrentUser() user: any, @Body() dto: BroadcastMessageDto) {
    return this.communicationService.broadcastMessage(user.id, dto);
  }
}
