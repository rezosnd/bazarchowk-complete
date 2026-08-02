import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import {
  UpdateSettingDto,
  ToggleFeatureFlagDto,
  CreateBannerDto,
  UpdateAppVersionDto
} from './dto/setting.dto';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  // --- APP SETTINGS (Maintenance Mode, etc.) --- //
  async upsertSetting(dto: UpdateSettingDto, adminId?: string) {
    const result = await this.prisma.appSetting.upsert({
      where: { key: dto.key },
      update: { value: dto.value, description: dto.description, updatedBy: adminId },
      create: { key: dto.key, value: dto.value, description: dto.description, updatedBy: adminId }
    });
    await this.cacheManager.del(`setting_${dto.key}`);
    await this.cacheManager.del('all_settings');
    return result;
  }

  async getSetting(key: string) {
    const cached = await this.cacheManager.get(`setting_${key}`);
    if (cached) return cached;

    const setting = await this.prisma.appSetting.findUnique({ where: { key } });
    if (!setting) return { key, value: null };
    
    await this.cacheManager.set(`setting_${key}`, setting);
    return setting;
  }

  async getAllSettings() {
    const cached = await this.cacheManager.get('all_settings');
    if (cached) return cached;

    const settings = await this.prisma.appSetting.findMany();
    await this.cacheManager.set('all_settings', settings);
    return settings;
  }

  // --- FEATURE FLAGS --- //
  async toggleFeatureFlag(dto: ToggleFeatureFlagDto) {
    const result = await this.prisma.featureFlag.upsert({
      where: { name: dto.name },
      update: { isEnabled: dto.isEnabled, description: dto.description },
      create: { name: dto.name, isEnabled: dto.isEnabled, description: dto.description }
    });
    await this.cacheManager.del('active_feature_flags');
    return result;
  }

  async getActiveFeatureFlags() {
    const cached = await this.cacheManager.get('active_feature_flags');
    if (cached) return cached;

    const flags = await this.prisma.featureFlag.findMany({ where: { isEnabled: true } });
    await this.cacheManager.set('active_feature_flags', flags);
    return flags;
  }

  async getAllFeatureFlags() {
    return this.prisma.featureFlag.findMany();
  }

  async deleteFeatureFlag(name: string) {
    const result = await this.prisma.featureFlag.delete({ where: { name } });
    await this.cacheManager.del('active_feature_flags');
    return result;
  }

  // --- BANNERS --- //
  async createBanner(dto: CreateBannerDto) {
    const result = await this.prisma.appBanner.create({
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      }
    });
    await this.cacheManager.del('active_banners');
    await this.cacheManager.del(`active_banners_${dto.position || 'all'}`);
    return result;
  }

  async getActiveBanners(position?: string) {
    const cacheKey = `active_banners_${position || 'all'}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const whereClause: any = { isActive: true };
    if (position) whereClause.position = position;

    const now = new Date();
    // Filter active banners within date bounds if defined
    const banners = await this.prisma.appBanner.findMany({
      where: {
        ...whereClause,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: { gte: now } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    
    await this.cacheManager.set(cacheKey, banners, 60000); // 1 minute cache since it's time-sensitive
    return banners;
  }

  async getAllBanners() {
    return this.prisma.appBanner.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async deleteBanner(id: string) {
    const result = await this.prisma.appBanner.delete({ where: { id } });
    await this.cacheManager.del('active_banners');
    await this.cacheManager.del(`active_banners_${result.position || 'all'}`);
    await this.cacheManager.del('active_banners_all');
    return result;
  }

  // --- APP VERSION CONTROL --- //
  async updateAppVersion(dto: UpdateAppVersionDto) {
    const result = await this.prisma.appVersion.upsert({
      where: { platform: dto.platform },
      update: {
        latestVersion: dto.latestVersion,
        minVersion: dto.minVersion,
        forceUpdate: dto.forceUpdate,
        updateUrl: dto.updateUrl,
        releaseNotes: dto.releaseNotes
      },
      create: dto
    });
    await this.cacheManager.del(`app_version_${dto.platform.toUpperCase()}`);
    return result;
  }

  async checkAppVersion(platform: string, currentVersion: string) {
    const cacheKey = `app_version_${platform.toUpperCase()}`;
    let versionConfig: any = await this.cacheManager.get(cacheKey);

    if (!versionConfig) {
      versionConfig = await this.prisma.appVersion.findUnique({ where: { platform: platform.toUpperCase() } });
      if (!versionConfig) throw new NotFoundException('Version config not found for platform');
      await this.cacheManager.set(cacheKey, versionConfig);
    }

    const compareVersions = (v1: string, v2: string) => {
      const parts1 = v1.split('.').map(Number);
      const parts2 = v2.split('.').map(Number);
      const maxLen = Math.max(parts1.length, parts2.length);
      for (let i = 0; i < maxLen; i++) {
        const num1 = parts1[i] || 0;
        const num2 = parts2[i] || 0;
        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
      }
      return 0;
    };

    const isUpdateAvailable = compareVersions(versionConfig.latestVersion, currentVersion) > 0;
    const isForceUpdate = versionConfig.forceUpdate && compareVersions(currentVersion, versionConfig.minVersion) < 0;

    return {
      isUpdateAvailable,
      isForceUpdate,
      latestVersion: versionConfig.latestVersion,
      updateUrl: versionConfig.updateUrl,
      releaseNotes: versionConfig.releaseNotes
    };
  }

  async getAllAppVersions() {
    return this.prisma.appVersion.findMany();
  }
}
