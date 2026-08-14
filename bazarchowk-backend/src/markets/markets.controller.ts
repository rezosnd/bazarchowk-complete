import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { MarketsService } from './markets.service';
import {
  CreateCountryDto,
  CreateStateDto,
  CreateDistrictDto,
  CreateCityDto,
  CreateVillageDto,
  CreateMarketDto,
  BootstrapGeoDto
} from './dto/market.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Market & Location Management')
@Controller('markets')
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) { }

  // --- COUNTRIES --- //
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @Post('countries')
  @ApiOperation({ summary: 'Create Country' })
  createCountry(@Body() dto: CreateCountryDto) {
    return this.marketsService.createCountry(dto);
  }

  @Get('countries')
  @ApiOperation({ summary: 'Get all countries' })
  getCountries() {
    return this.marketsService.getCountries();
  }

  // --- STATES --- //
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @Post('states')
  @ApiOperation({ summary: 'Create State' })
  createState(@Body() dto: CreateStateDto) {
    return this.marketsService.createState(dto);
  }

  @Get('countries/:countryId/states')
  @ApiOperation({ summary: 'Get states by country' })
  getStatesByCountry(@Param('countryId') countryId: string) {
    return this.marketsService.getStatesByCountry(countryId);
  }

  // --- DISTRICTS --- //
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @Post('districts')
  @ApiOperation({ summary: 'Create District' })
  createDistrict(@Body() dto: CreateDistrictDto) {
    return this.marketsService.createDistrict(dto);
  }

  @Get('states/:stateId/districts')
  @ApiOperation({ summary: 'Get districts by state' })
  getDistrictsByState(@Param('stateId') stateId: string) {
    return this.marketsService.getDistrictsByState(stateId);
  }

  // --- CITIES --- //
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @Post('cities')
  @ApiOperation({ summary: 'Create City' })
  createCity(@Body() dto: CreateCityDto) {
    return this.marketsService.createCity(dto);
  }

  @Get('districts/:districtId/cities')
  @ApiOperation({ summary: 'Get cities by district' })
  getCitiesByDistrict(@Param('districtId') districtId: string) {
    return this.marketsService.getCitiesByDistrict(districtId);
  }

  // --- VILLAGES --- //
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @Post('villages')
  @ApiOperation({ summary: 'Create Village' })
  createVillage(@Body() dto: CreateVillageDto) {
    return this.marketsService.createVillage(dto);
  }

  @Get('cities/:cityId/villages')
  @ApiOperation({ summary: 'Get villages by city' })
  getVillagesByCity(@Param('cityId') cityId: string) {
    return this.marketsService.getVillagesByCity(cityId);
  }

  @Get('all-villages')
  @ApiOperation({ summary: 'Get all villages globally' })
  getAllVillages() {
    return this.marketsService.getAllVillages();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @Post('bootstrap-default-geo')
  @ApiOperation({ summary: 'Bootstrap initial geographic zones if empty' })
  bootstrapDefaultGeo(@Body() dto: BootstrapGeoDto) {
    return this.marketsService.bootstrapDefaultGeo(dto);
  }

  // --- MARKETS --- //
  @Get()
  @ApiOperation({ summary: 'Get all markets (optionally filtered by location)' })
  getAllMarkets(@Query('lat') lat?: string, @Query('lng') lng?: string) {
    return this.marketsService.getAllMarkets(lat ? parseFloat(lat) : undefined, lng ? parseFloat(lng) : undefined);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @Post('market-nodes')
  @ApiOperation({ summary: 'Create Market Node' })
  createMarket(@Body() dto: CreateMarketDto) {
    return this.marketsService.createMarket(dto);
  }

  @Get('villages/:villageId/markets')
  @ApiOperation({ summary: 'Get markets by village' })
  getMarketsByVillage(@Param('villageId') villageId: string) {
    return this.marketsService.getMarketsByVillage(villageId);
  }

  @Get('market-nodes/:id')
  @ApiOperation({ summary: 'Get full market details' })
  getMarketDetails(@Param('id') id: string) {
    return this.marketsService.getMarketDetails(id);
  }
}
