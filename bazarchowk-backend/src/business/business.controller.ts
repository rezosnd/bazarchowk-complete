import { Controller, Post, Get, Body, Param, UseGuards, Patch } from '@nestjs/common';
import { BusinessService } from './business.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Business Onboarding')
@Controller('business')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new Business/Partner' })
  registerBusiness(@Body() dto: any, @CurrentUser() user: any) {
    return this.businessService.registerBusiness(user.id, dto);
  }

  @Post('upload-document')
  @ApiOperation({ summary: 'Upload KYC/License documents' })
  uploadDocument(@Body() dto: any, @CurrentUser() user: any) {
    return this.businessService.uploadDocument(dto.businessId, user.id, dto.documentType, dto.documentUrl);
  }

  @Get('my-businesses')
  @ApiOperation({ summary: 'Get all businesses owned by user' })
  getMyBusinesses(@CurrentUser() user: any) {
    return this.businessService.getMyBusinesses(user.id);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin approve business' })
  approveBusiness(@Param('id') id: string, @CurrentUser() user: any) {
    return this.businessService.approveBusiness(id, user.id);
  }
}
