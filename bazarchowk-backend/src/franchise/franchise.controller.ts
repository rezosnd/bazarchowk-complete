import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FranchiseService } from './franchise.service';
import {
  CreateDistrictAdminDto,
  CreateMarketAdminDto,
  AssignTerritoryDto,
  UpdatePermissionsDto,
} from './dto/franchise.dto';

@ApiTags('Franchise / Market Admin Management (Module 47)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('franchise')
export class FranchiseController {
  constructor(private readonly franchiseService: FranchiseService) {}

  // ---- DISTRICT ADMIN MANAGEMENT ----

  @Post('district-admins')
  @ApiOperation({ summary: 'SuperAdmin: Create a new District Admin from an existing user' })
  createDistrictAdmin(@Body() dto: CreateDistrictAdminDto) {
    return this.franchiseService.createDistrictAdmin(dto);
  }

  @Get('district-admins')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'List all District Admins with their market admin counts' })
  getAllDistrictAdmins() {
    return this.franchiseService.getAllDistrictAdmins();
  }

  @Patch('district-admins/:id/toggle')
  @ApiOperation({ summary: 'SuperAdmin: Activate or deactivate a District Admin' })
  toggleDistrictAdmin(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.franchiseService.toggleDistrictAdmin(id, body.isActive);
  }

  @Patch('district-admins/:id/permissions')
  @ApiOperation({ summary: 'SuperAdmin: Update granular permissions for a District Admin' })
  updateDistrictPermissions(@Param('id') id: string, @Body() dto: UpdatePermissionsDto) {
    return this.franchiseService.updateDistrictAdminPermissions(id, dto);
  }

  @Get('district-admins/:id/performance')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Get District Admin performance report (revenue, orders, shops)' })
  getDistrictPerformance(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.franchiseService.getDistrictAdminPerformance(id, new Date(startDate), new Date(endDate));
  }

  // ---- MARKET ADMIN MANAGEMENT ----

  @Post('market-admins')
  @ApiOperation({ summary: 'SuperAdmin: Create a new Market Admin from an existing user' })
  createMarketAdmin(@Body() dto: CreateMarketAdminDto) {
    return this.franchiseService.createMarketAdmin(dto);
  }

  @Get('market-admins')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'List all Market Admins, optionally filtered by District Admin' })
  @ApiQuery({ name: 'districtAdminId', required: false })
  getAllMarketAdmins(@Query('districtAdminId') districtAdminId?: string) {
    return this.franchiseService.getAllMarketAdmins(districtAdminId);
  }

  @Patch('market-admins/:id/permissions')
  @ApiOperation({ summary: 'SuperAdmin: Update granular permissions for a Market Admin' })
  updateMarketPermissions(@Param('id') id: string, @Body() dto: UpdatePermissionsDto) {
    return this.franchiseService.updateMarketAdminPermissions(id, dto);
  }

  // ---- TERRITORY ASSIGNMENT ----

  @Post('market-admins/:id/territories')
  @ApiOperation({ summary: 'SuperAdmin: Assign a market territory to a Market Admin' })
  assignTerritory(@Param('id') id: string, @Body() dto: AssignTerritoryDto) {
    return this.franchiseService.assignTerritory(id, dto);
  }

  @Get('market-admins/:id/territories')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'List all territory assignments for a Market Admin' })
  getTerritories(@Param('id') id: string) {
    return this.franchiseService.getMarketAdminTerritories(id);
  }

  // ---- SHOP & RIDER ASSIGNMENT VIEWS ----

  @Get('market-admins/:id/shops')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'List all Shops assigned to a Market Admin based on territory' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getAssignedShops(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.franchiseService.getAssignedShops(id, Number(page), Number(limit));
  }

  @Get('market-admins/:id/riders')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'List all Riders active in a Market Admin\'s territory' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getAssignedRiders(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.franchiseService.getAssignedRiders(id, Number(page), Number(limit));
  }
}
