import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UpdateSettingDto,
  ToggleFeatureFlagDto,
  CreateBannerDto,
  UpdateAppVersionDto
} from './dto/setting.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- APP SETTINGS (Maintenance Mode, etc.) --- //
  async upsertSetting(dto: UpdateSettingDto, adminId?: string) {
    return this.prisma.appSetting.upsert({
      where: { key: dto.key },
      update: { value: dto.value, description: dto.description, updatedBy: adminId },
      create: { key: dto.key, value: dto.value, description: dto.description, updatedBy: adminId }
    });
  }

  async getSetting(key: string) {
    const setting = await this.prisma.appSetting.findUnique({ where: { key } });
    if (!setting) return { key, value: null };
    return setting;
  }

  async getAllSettings() {
    return this.prisma.appSetting.findMany();
  }

  // --- FEATURE FLAGS --- //
  async toggleFeatureFlag(dto: ToggleFeatureFlagDto) {
    return this.prisma.featureFlag.upsert({
      where: { name: dto.name },
      update: { isEnabled: dto.isEnabled, description: dto.description },
      create: { name: dto.name, isEnabled: dto.isEnabled, description: dto.description }
    });
  }

  async getActiveFeatureFlags() {
    return this.prisma.featureFlag.findMany({ where: { isEnabled: true } });
  }

  // --- BANNERS --- //
  async createBanner(dto: CreateBannerDto) {
    return this.prisma.appBanner.create({
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      }
    });
  }

  async getActiveBanners(position?: string) {
    const whereClause: any = { isActive: true };
    if (position) whereClause.position = position;

    const now = new Date();
    // Filter active banners within date bounds if defined
    return this.prisma.appBanner.findMany({
      where: {
        ...whereClause,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: { gte: now } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // --- APP VERSION CONTROL --- //
  async updateAppVersion(dto: UpdateAppVersionDto) {
    return this.prisma.appVersion.upsert({
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
  }

  async checkAppVersion(platform: string, currentVersion: string) {
    const versionConfig = await this.prisma.appVersion.findUnique({ where: { platform: platform.toUpperCase() } });
    if (!versionConfig) throw new NotFoundException('Version config not found for platform');

    // Simple string comparison logic (Assumes semantic versioning like 1.0.5)
    // For production, a library like `semver` is better.
    const isUpdateAvailable = versionConfig.latestVersion !== currentVersion;
    const isForceUpdate = versionConfig.forceUpdate && currentVersion < versionConfig.minVersion;

    return {
      isUpdateAvailable,
      isForceUpdate,
      latestVersion: versionConfig.latestVersion,
      updateUrl: versionConfig.updateUrl,
      releaseNotes: versionConfig.releaseNotes
    };
  }
}
