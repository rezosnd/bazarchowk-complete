import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Delivery Rules (Admin)')
@Controller('delivery-rules')
export class DeliveryRulesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':marketId')
  @ApiOperation({ summary: 'Get delivery rules (Radius & Fees) for a market' })
  async getRules(@Param('marketId') marketId: string) {
    let rule = await this.prisma.deliveryRule.findUnique({ where: { marketId } });
    if (!rule) {
      rule = await this.prisma.deliveryRule.create({ data: { marketId } });
    }
    return rule;
  }

  @Patch(':marketId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin updates the delivery fee and radius' })
  async updateRules(@Param('marketId') marketId: string, @Body() data: any) {
    return this.prisma.deliveryRule.upsert({
      where: { marketId },
      update: data,
      create: { marketId, ...data }
    });
  }
}
