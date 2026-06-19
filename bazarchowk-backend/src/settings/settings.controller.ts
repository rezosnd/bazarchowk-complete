import { Controller, Get, Post, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { SettingsService } from './settings.service';
import {
  UpdateSettingDto,
  ToggleFeatureFlagDto,
  CreateBannerDto,
  UpdateAppVersionDto
} from './dto/setting.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Settings & Configuration')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // --- GLOBAL CONFIG (Public/Frontend Initialization) --- //
  @Get('init')
  @ApiOperation({ summary: 'Get global startup config (Flags, Version, Maintenance)' })
  async getStartupConfig(@Query('platform') platform: string, @Query('version') version: string) {
    const maintenance = await this.settingsService.getSetting('MAINTENANCE_MODE');
    const flags = await this.settingsService.getActiveFeatureFlags();
    
    let versionCheck = null;
    if (platform && version) {
      try {
        versionCheck = await this.settingsService.checkAppVersion(platform, version);
      } catch (e) {
        // Ignore if not found
      }
    }

    return {
      maintenanceMode: maintenance?.value === 'true',
      featureFlags: flags.map(f => f.name),
      versionCheck
    };
  }

  // --- ADMIN SETTINGS --- //
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @Post('config')
  @ApiOperation({ summary: 'Upsert global app setting' })
  upsertSetting(@Req() req: any, @Body() dto: UpdateSettingDto) {
    return this.settingsService.upsertSetting(dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @Post('flags')
  @ApiOperation({ summary: 'Toggle feature flag' })
  toggleFeatureFlag(@Body() dto: ToggleFeatureFlagDto) {
    return this.settingsService.toggleFeatureFlag(dto);
  }

  // --- BANNERS --- //
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @Post('banners')
  @ApiOperation({ summary: 'Create new active banner' })
  createBanner(@Body() dto: CreateBannerDto) {
    return this.settingsService.createBanner(dto);
  }

  @Get('banners')
  @ApiOperation({ summary: 'Get active banners' })
  getActiveBanners(@Query('position') position?: string) {
    return this.settingsService.getActiveBanners(position);
  }

  // --- VERSIONING --- //
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @Post('version')
  @ApiOperation({ summary: 'Update App Version Control' })
  updateAppVersion(@Body() dto: UpdateAppVersionDto) {
    return this.settingsService.updateAppVersion(dto);
  }
}
