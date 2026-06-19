import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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
  constructor(private readonly prisma: PrismaService) {}

  // --- COUNTRY --- //
  async createCountry(dto: CreateCountryDto) {
    return this.prisma.country.create({ data: dto });
  }

  async getCountries() {
    return this.prisma.country.findMany({ include: { states: true } });
  }

  // --- STATE --- //
  async createState(dto: CreateStateDto) {
    return this.prisma.state.create({ data: dto });
  }

  async getStatesByCountry(countryId: string) {
    return this.prisma.state.findMany({
      where: { countryId },
      include: { districts: true }
    });
  }

  // --- DISTRICT --- //
  async createDistrict(dto: CreateDistrictDto) {
    return this.prisma.district.create({ data: dto });
  }

  async getDistrictsByState(stateId: string) {
    return this.prisma.district.findMany({
      where: { stateId },
      include: { cities: true }
    });
  }

  // --- CITY --- //
  async createCity(dto: CreateCityDto) {
    return this.prisma.city.create({ data: dto });
  }

  async getCitiesByDistrict(districtId: string) {
    return this.prisma.city.findMany({
      where: { districtId },
      include: { villages: true }
    });
  }

  // --- VILLAGE --- //
  async createVillage(dto: CreateVillageDto) {
    return this.prisma.village.create({ data: dto });
  }

  async getVillagesByCity(cityId: string) {
    return this.prisma.village.findMany({
      where: { cityId },
      include: { markets: true }
    });
  }

  // --- MARKET --- //
  async createMarket(dto: CreateMarketDto) {
    return this.prisma.market.create({ data: dto });
  }

  async getMarketsByVillage(villageId: string) {
    return this.prisma.market.findMany({ where: { villageId } });
  }

  async getMarketDetails(id: string) {
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
    return market;
  }
}
