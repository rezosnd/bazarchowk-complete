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
  CreateMarketDto
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

  // --- MARKET --- //
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
}
