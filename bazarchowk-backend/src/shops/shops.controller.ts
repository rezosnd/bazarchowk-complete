import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { CreateShopTimingDto, BulkUpdateTimingsDto, CreateShopHolidayDto } from './dto/create-shop-timing.dto';
import { CreateShopDocumentDto } from './dto/create-shop-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('Shops')
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  // ==================== SHOP CRUD ====================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Partner: Register a new shop' })
  create(@Body() dto: CreateShopDto, @CurrentUser() user: any) {
    return this.shopsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Public: List all shops (optionally filtered by radius)' })
  findAll(@Query('lat') lat?: string, @Query('lng') lng?: string) {
    return this.shopsService.findAll(lat ? parseFloat(lat) : undefined, lng ? parseFloat(lng) : undefined);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Partner: Get own shop' })
  findMyShop(@CurrentUser() user: any) {
    return this.shopsService.findMyShop(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Public: Get a shop — includes real-time status (OPEN/CLOSED + reason)',
    description: 'Returns status: { isOpen, label, reason } computed for current IST time. Shows "Holiday: Diwali" if partner marked that date closed.',
  })
  findOne(@Param('id') id: string) {
    return this.shopsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Partner: Update shop profile (name, description, logo etc.)' })
  update(@Param('id') id: string, @Body() dto: UpdateShopDto, @CurrentUser() user: any) {
    const isAdmin = user.role?.name === 'ADMIN' || user.role?.name === 'SUPER_ADMIN';
    return this.shopsService.update(id, user.id, dto, isAdmin);
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Verify or unverify a shop' })
  verifyShop(@Param('id') id: string, @Body('isVerified') isVerified: boolean, @CurrentUser() user: any) {
    return this.shopsService.verifyShop(id, user.id, isVerified);
  }

  // ==================== PARTNER: TIMING MANAGEMENT ====================

  @Get(':id/timings')
  @ApiOperation({ summary: 'Public: Get weekly schedule for a shop (partner sets these)' })
  getTimings(@Param('id') id: string) {
    return this.shopsService.getTimings(id);
  }

  @Post(':id/timings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Partner: Set/update a single day timing',
    description: 'Use dayOfWeek 0-6 (0=Sunday). Set isClosed:true to mark the whole day as closed.',
  })
  upsertTiming(@Param('id') id: string, @Body() dto: CreateShopTimingDto, @CurrentUser() user: any) {
    return this.shopsService.upsertTiming(id, user.id, dto);
  }

  @Post(':id/timings/bulk')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Partner: Set all 7 days schedule in one call (recommended for initial setup)',
    description: 'Send an array of up to 7 day timings. The app shows a weekly schedule grid to the partner.',
  })
  bulkUpsertTimings(@Param('id') id: string, @Body() dto: BulkUpdateTimingsDto, @CurrentUser() user: any) {
    return this.shopsService.bulkUpsertTimings(id, user.id, dto);
  }

  // ==================== PARTNER: HOLIDAY / CLOSURE MANAGEMENT ====================

  @Get(':id/holidays')
  @ApiOperation({ summary: 'Public: Get upcoming holidays/closure dates for a shop' })
  getHolidays(@Param('id') id: string) {
    return this.shopsService.getHolidays(id);
  }

  @Post(':id/holidays')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Partner: Mark a specific date as closed (holiday, sick day, renovation, etc.)',
    description: 'Customers searching on that date will see "Closed: Diwali" instead of booking options. Cannot set past dates.',
  })
  addHoliday(@Param('id') id: string, @Body() dto: CreateShopHolidayDto, @CurrentUser() user: any) {
    return this.shopsService.addHoliday(id, user.id, dto);
  }

  @Delete(':shopId/holidays/:holidayId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Partner: Remove a holiday (shop will be open again on that date)' })
  removeHoliday(@Param('shopId') shopId: string, @Param('holidayId') holidayId: string, @CurrentUser() user: any) {
    return this.shopsService.removeHoliday(shopId, user.id, holidayId);
  }

  // ==================== DOCUMENT MANAGEMENT ====================

  @Post(':id/documents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Partner: Upload a shop document (FSSAI, GST, etc.)' })
  addDocument(@Param('id') id: string, @Body() docDto: CreateShopDocumentDto, @CurrentUser() user: any) {
    return this.shopsService.addDocument(id, user.id, docDto);
  }

  @Patch('documents/:documentId/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Verify a shop document' })
  verifyDocument(@Param('documentId') documentId: string, @Body('isVerified') isVerified: boolean) {
    return this.shopsService.verifyDocument(documentId, isVerified);
  }
}
