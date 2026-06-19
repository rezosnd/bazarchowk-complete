import { Controller, Get, Post, Patch, Param, Query, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SuperAdminService } from './super-admin.service';
import { 
  PaginationQueryDto, 
  ShopFilterDto, 
  FraudFilterDto, 
  RevenueFilterDto, 
  CreateMarketDto, 
  UpdateMarketDto, 
  CreateCityConfigDto 
} from './dto/super-admin.dto';

@ApiTags('Super Admin Platform (Ecosystem Management)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  // --- DASHBOARD ---

  @Get('dashboard')
  @ApiOperation({ summary: 'Platform-wide overview: users, revenue, shops, fraud, support' })
  getDashboard() {
    return this.superAdminService.getPlatformOverview();
  }

  // --- USER MANAGEMENT ---

  @Get('users')
  @ApiOperation({ summary: 'List all users with search & pagination' })
  getUsers(@Query() query: PaginationQueryDto) {
    return this.superAdminService.getAllUsers(Number(query.page || 1), Number(query.limit || 50), query.search);
  }

  @Patch('users/:id/ban')
  @ApiOperation({ summary: 'Ban a user account' })
  banUser(@Param('id') id: string) {
    return this.superAdminService.banUser(id);
  }

  @Patch('users/:id/unban')
  @ApiOperation({ summary: 'Unban a user account' })
  unbanUser(@Param('id') id: string) {
    return this.superAdminService.unbanUser(id);
  }

  // --- SHOP MANAGEMENT ---

  @Get('shops')
  @ApiOperation({ summary: 'List all shops with verification filter & pagination' })
  getShops(@Query() query: ShopFilterDto) {
    return this.superAdminService.getAllShops(Number(query.page || 1), Number(query.limit || 50), query.verified);
  }

  @Patch('shops/:id/verify')
  @ApiOperation({ summary: 'Verify a shop (allow it to go live)' })
  verifyShop(@Param('id') id: string) {
    return this.superAdminService.verifyShop(id);
  }

  @Patch('shops/:id/suspend')
  @ApiOperation({ summary: 'Suspend/deactivate a shop' })
  suspendShop(@Param('id') id: string) {
    return this.superAdminService.suspendShop(id);
  }

  // --- REVENUE MANAGEMENT ---

  @Get('revenue')
  @ApiOperation({ summary: 'Platform revenue report with top shops' })
  getRevenue(@Query() query: RevenueFilterDto) {
    return this.superAdminService.getRevenueReport(new Date(query.startDate), new Date(query.endDate), query.groupBy);
  }

  // --- ADVERTISEMENT MANAGEMENT ---

  @Get('ads/pending')
  @ApiOperation({ summary: 'List all pending advertisement approvals' })
  getPendingAds() {
    return this.superAdminService.getPendingAds();
  }

  @Patch('ads/:id/approve')
  @ApiOperation({ summary: 'Approve an advertisement (sets status to ACTIVE)' })
  approveAd(@Param('id') id: string) {
    return this.superAdminService.approveAd(id);
  }

  @Patch('ads/:id/reject')
  @ApiOperation({ summary: 'Reject an advertisement' })
  rejectAd(@Param('id') id: string) {
    return this.superAdminService.rejectAd(id);
  }

  // --- DELIVERY NETWORK MANAGEMENT ---

  @Get('delivery-partners')
  @ApiOperation({ summary: 'List all registered delivery partners with stats' })
  getDeliveryNetwork(@Query() query: PaginationQueryDto) {
    return this.superAdminService.getDeliveryNetwork(Number(query.page || 1), Number(query.limit || 50));
  }

  // --- FRAUD MANAGEMENT ---

  @Get('fraud-logs')
  @ApiOperation({ summary: 'List all fraud logs (filter by resolved status)' })
  getFraudLogs(@Query() query: FraudFilterDto) {
    return this.superAdminService.getFraudLogs(Number(query.page || 1), Number(query.limit || 50), query.resolved);
  }

  @Patch('fraud-logs/:id/resolve')
  @ApiOperation({ summary: 'Mark a fraud log as resolved' })
  resolveFraudLog(@Param('id') id: string) {
    return this.superAdminService.resolveFraudLog(id);
  }

  // --- MARKET MANAGEMENT ---

  @Post('markets')
  @ApiOperation({ summary: 'Create a new Market zone within a Village' })
  createMarket(@Body() dto: CreateMarketDto) {
    return this.superAdminService.createMarket(dto);
  }

  @Get('markets')
  @ApiOperation({ summary: 'Get all markets' })
  getMarkets(@Query() query: PaginationQueryDto) {
    return this.superAdminService.getMarkets(Number(query.page || 1), Number(query.limit || 50), query.search);
  }

  @Patch('markets/:id')
  @ApiOperation({ summary: 'Update a market zone' })
  updateMarket(@Param('id') id: string, @Body() dto: UpdateMarketDto) {
    return this.superAdminService.updateMarket(id, dto);
  }

  // --- CITY MANAGEMENT ---

  @Post('cities')
  @ApiOperation({ summary: 'Create a new City configuration for regional operations' })
  createCity(@Body() dto: CreateCityConfigDto) {
    return this.superAdminService.createCityConfig(dto);
  }

  @Get('cities')
  @ApiOperation({ summary: 'Get all city configurations' })
  getCities(@Query() query: PaginationQueryDto) {
    return this.superAdminService.getCities(Number(query.page || 1), Number(query.limit || 50));
  }

  // --- ACTIONS LOGGING ---

  @Get('actions')
  @ApiOperation({ summary: 'Get audit log of all super admin actions' })
  getAdminActions(@Query() query: PaginationQueryDto) {
    return this.superAdminService.getAdminActions(Number(query.page || 1), Number(query.limit || 50));
  }

  // --- PLATFORM REPORTS ---

  @Get('reports')
  @ApiOperation({ summary: 'Get generated platform reports' })
  @ApiQuery({ name: 'reportType', required: false })
  getReports(@Query() query: PaginationQueryDto, @Query('reportType') reportType?: string) {
    return this.superAdminService.getPlatformReports(Number(query.page || 1), Number(query.limit || 50), reportType);
  }

  // --- OPERATIONAL LOGS ---

  @Get('logs/operational')
  @ApiOperation({ summary: 'Get system operational logs' })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'module', required: false })
  getOperationalLogs(
    @Query() query: PaginationQueryDto,
    @Query('severity') severity?: string,
    @Query('module') moduleName?: string
  ) {
    return this.superAdminService.getOperationalLogs(Number(query.page || 1), Number(query.limit || 50), severity, moduleName);
  }

  @Patch('logs/operational/:id/resolve')
  @ApiOperation({ summary: 'Mark an operational log as resolved' })
  resolveOperationalLog(@Param('id') id: string) {
    return this.superAdminService.resolveOperationalLog(id);
  }

  // --- CASH COLLECTION MONITORING ---

  @Get('cash-collections')
  @ApiOperation({ summary: 'Monitor rider cash collections' })
  @ApiQuery({ name: 'status', required: false })
  getCashCollections(@Query() query: PaginationQueryDto, @Query('status') status?: string) {
    return this.superAdminService.getCashCollections(Number(query.page || 1), Number(query.limit || 50), status);
  }
}
