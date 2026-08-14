import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCountryDto,
  CreateStateDto,
  CreateDistrictDto,
  CreateCityDto,
  CreateVillageDto,
  CreateMarketDto,
  BootstrapGeoDto
} from './dto/market.dto';

@Injectable()
export class MarketsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // --- COUNTRY --- //
  async createCountry(dto: CreateCountryDto) {
    const res = await this.prisma.country.create({ data: dto });
    await this.cacheManager.del('countries');
    return res;
  }

  async getCountries() {
    const cached = await this.cacheManager.get('countries');
    if (cached) return cached;
    const res = await this.prisma.country.findMany({ include: { states: true } });
    await this.cacheManager.set('countries', res, 3600000); // 1 hour
    return res;
  }

  // --- STATE --- //
  async createState(dto: CreateStateDto) {
    const res = await this.prisma.state.create({ data: dto });
    await this.cacheManager.del(`states_${dto.countryId}`);
    return res;
  }

  async getStatesByCountry(countryId: string) {
    const cacheKey = `states_${countryId}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;
    const res = await this.prisma.state.findMany({
      where: { countryId },
      include: { districts: true }
    });
    await this.cacheManager.set(cacheKey, res, 3600000);
    return res;
  }

  // --- DISTRICT --- //
  async createDistrict(dto: CreateDistrictDto) {
    const res = await this.prisma.district.create({ data: dto });
    await this.cacheManager.del(`districts_${dto.stateId}`);
    return res;
  }

  async getDistrictsByState(stateId: string) {
    const cacheKey = `districts_${stateId}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;
    const res = await this.prisma.district.findMany({
      where: { stateId },
      include: { cities: true }
    });
    await this.cacheManager.set(cacheKey, res, 3600000);
    return res;
  }

  // --- CITY --- //
  async createCity(dto: CreateCityDto) {
    const res = await this.prisma.city.create({ data: dto });
    await this.cacheManager.del(`cities_${dto.districtId}`);
    return res;
  }

  async getCitiesByDistrict(districtId: string) {
    const cacheKey = `cities_${districtId}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;
    const res = await this.prisma.city.findMany({
      where: { districtId },
      include: { villages: true }
    });
    await this.cacheManager.set(cacheKey, res, 3600000);
    return res;
  }

  // --- VILLAGE --- //
  async createVillage(dto: CreateVillageDto) {
    const res = await this.prisma.village.create({ data: dto });
    await this.cacheManager.del(`villages_${dto.cityId}`);
    return res;
  }

  async getVillagesByCity(cityId: string) {
    const cacheKey = `villages_${cityId}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;
    const res = await this.prisma.village.findMany({
      where: { cityId },
      include: { markets: true }
    });
    await this.cacheManager.set(cacheKey, res, 3600000);
    return res;
  }

  async getAllVillages() {
    return this.prisma.village.findMany({
      include: {
        city: {
          include: {
            district: {
              include: { state: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  async bootstrapDefaultGeo(dto: BootstrapGeoDto) {
    // 1. Country
    const country = await this.prisma.country.upsert({
      where: { code: dto.countryName.substring(0, 2).toUpperCase() },
      update: {},
      create: { name: dto.countryName, code: dto.countryName.substring(0, 2).toUpperCase() },
    });
    // 2. State
    const state = await this.prisma.state.upsert({
      where: { countryId_name: { countryId: country.id, name: dto.stateName } },
      update: {},
      create: { countryId: country.id, name: dto.stateName, code: dto.stateName.substring(0, 2).toUpperCase() },
    });
    // 3. District
    const district = await this.prisma.district.upsert({
      where: { stateId_name: { stateId: state.id, name: dto.districtName } },
      update: {},
      create: { stateId: state.id, name: dto.districtName },
    });
    // 4. City
    const city = await this.prisma.city.upsert({
      where: { districtId_name: { districtId: district.id, name: dto.cityName } },
      update: {},
      create: { districtId: district.id, name: dto.cityName, pincode: dto.pincode },
    });
    // 5. Village
    const village = await this.prisma.village.upsert({
      where: { cityId_name: { cityId: city.id, name: dto.villageName } },
      update: {},
      create: { cityId: city.id, name: dto.villageName, pincode: dto.pincode, latitude: 25.0, longitude: 85.0 },
    });

    return { message: 'Boostrap successful', villageId: village.id, villageName: village.name };
  }

  // --- MARKET --- //
  async getAllMarkets(lat?: number, lng?: number) {
    const cacheKey = `markets_all_${lat || 'none'}_${lng || 'none'}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;
    
    let markets = await this.prisma.market.findMany({
      include: {
        village: {
          include: { city: true }
        }
      }
    });

    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      markets = markets.filter(market => {
        if (market.latitude == null || market.longitude == null) return false;
        const R = 6371;
        const dLat = (market.latitude - lat) * (Math.PI / 180);
        const dLon = (market.longitude - lng) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat * (Math.PI / 180)) * Math.cos(market.latitude * (Math.PI / 180)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;
        (market as any).distanceKm = distanceKm;
        return distanceKm <= 30; // 30km radius for markets
      }).sort((a, b) => (a as any).distanceKm - (b as any).distanceKm);
    }

    await this.cacheManager.set(cacheKey, markets, 60000);
    return markets;
  }

  async createMarket(dto: CreateMarketDto) {
    const res = await this.prisma.market.create({ data: dto });
    await this.cacheManager.del(`markets_village_${dto.villageId}`);
    return res;
  }

  async getMarketsByVillage(villageId: string) {
    const cacheKey = `markets_village_${villageId}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;
    const res = await this.prisma.market.findMany({ where: { villageId } });
    await this.cacheManager.set(cacheKey, res, 3600000);
    return res;
  }

  async getMarketDetails(id: string) {
    const cacheKey = `market_details_${id}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const market = await this.prisma.market.findUnique({
      where: { id },
      include: {
        village: {
          include: {
            city: {
              include: {
                district: {
                  include: {
                    state: {
                      include: { country: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!market) throw new NotFoundException('Market not found');
    await this.cacheManager.set(cacheKey, market, 3600000);
    return market;
  }

  async updateMarketConfig(id: string, configDto: any, user: any) {
    const market = await this.prisma.market.findUnique({ where: { id } });
    if (!market) throw new NotFoundException('Market not found');

    // Make sure they are super admin or the admin of this specific market
    if (user.role.name !== 'SUPER_ADMIN' && market.adminId !== user.id) {
      throw new BadRequestException('You do not have permission to update config for this market.');
    }

    const updated = await this.prisma.market.update({
      where: { id },
      data: {
        deliveryChargeConfig: configDto.deliveryChargeConfig !== undefined ? configDto.deliveryChargeConfig : market.deliveryChargeConfig,
        gstPercentage: configDto.gstPercentage !== undefined ? parseFloat(configDto.gstPercentage) : market.gstPercentage,
      }
    });

    // Clear caches
    await this.cacheManager.del(`market_details_${id}`);
    await this.cacheManager.del(`markets_village_${market.villageId}`);
    return updated;
  }
}
