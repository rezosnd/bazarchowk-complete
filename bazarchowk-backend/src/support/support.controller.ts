import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateTicketDto, AddMessageDto, UpdateTicketStatusDto } from './dto/support.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Support & Ticketing')
@Controller('support')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Create a new support ticket (Customer/Shop)' })
  createTicket(@Req() req: any, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(req.user.id, dto);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Get all tickets for the logged-in user' })
  getUserTickets(@Req() req: any) {
    return this.supportService.getUserTickets(req.user.id);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get full ticket details and chat history' })
  getTicketDetails(@Req() req: any, @Param('id') ticketId: string) {
    return this.supportService.getTicketDetails(req.user.id, ticketId, false);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Reply to a ticket' })
  addMessage(@Req() req: any, @Param('id') ticketId: string, @Body() dto: AddMessageDto) {
    return this.supportService.addMessage(req.user.id, ticketId, dto, 'USER');
  }

  // Admin Endpoints
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT_AGENT')
  @Get('admin/tickets')
  @ApiOperation({ summary: 'Get all tickets (Admin)' })
  getAllTickets(@Query('status') status?: string) {
    return this.supportService.getAllTicketsForAdmin(status);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT_AGENT')
  @Get('admin/tickets/:id')
  @ApiOperation({ summary: 'Get full ticket details (Admin)' })
  getAdminTicketDetails(@Req() req: any, @Param('id') ticketId: string) {
    return this.supportService.getTicketDetails(req.user.id, ticketId, true);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT_AGENT')
  @Post('admin/tickets/:id/messages')
  @ApiOperation({ summary: 'Reply to a ticket as Support Agent' })
  addAdminMessage(@Req() req: any, @Param('id') ticketId: string, @Body() dto: AddMessageDto) {
    return this.supportService.addMessage(req.user.id, ticketId, dto, 'ADMIN');
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT_AGENT')
  @Patch('admin/tickets/:id/status')
  @ApiOperation({ summary: 'Update ticket resolution status' })
  updateTicketStatus(@Param('id') ticketId: string, @Body() dto: UpdateTicketStatusDto) {
    return this.supportService.updateTicketStatus(ticketId, dto);
  }
}
