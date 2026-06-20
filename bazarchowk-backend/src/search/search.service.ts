import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQueryDto, SearchType } from './dto/search.dto';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(searchQuery: SearchQueryDto) {
    const { query, type = SearchType.ALL, limit = 10, offset = 0, city } = searchQuery;
    
    // Format query for Postgres to_tsquery (e.g., "apple & juice" or "apple | juice")
    const formattedQuery = query.trim().split(/\s+/).join(' | ');

    let products: any[] = [];
    let shops: any[] = [];
    let services: any[] = [];

    // Base conditions for shops
    const shopConditions: any = { isActive: true };
    if (city) {
      shopConditions.city = { equals: city, mode: 'insensitive' };
    }

    if (type === SearchType.ALL || type === SearchType.PRODUCTS) {
      products = await this.prisma.product.findMany({
        where: {
          isPublished: true,
          shop: shopConditions,
          OR: [
            { name: { search: formattedQuery } },
            { description: { search: formattedQuery } },
            { searchTerms: { search: formattedQuery } },
            // Fallback for partial matches
            { name: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          shop: { select: { id: true, name: true, city: true, deliveryRadius: true, latitude: true, longitude: true } },
          images: { where: { isPrimary: true }, take: 1 },
          variants: true,
        },
        take: Number(limit),
        skip: Number(offset),
      });
    }

    if (type === SearchType.ALL || type === SearchType.SHOPS) {
      shops = await this.prisma.shop.findMany({
        where: {
          ...shopConditions,
          OR: [
            { name: { search: formattedQuery } },
            { description: { search: formattedQuery } },
            { name: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: Number(limit),
        skip: Number(offset),
      });
    }

    if (type === SearchType.ALL || type === SearchType.SERVICES) {
      services = await this.prisma.serviceOffering.findMany({
        where: {
          isActive: true,
          shop: shopConditions,
          OR: [
            { name: { search: formattedQuery } },
            { description: { search: formattedQuery } },
            { name: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          shop: { select: { id: true, name: true, city: true, deliveryRadius: true, latitude: true, longitude: true } },
        },
        take: Number(limit),
        skip: Number(offset),
      });
    }

    // Geofencing if lat/lon provided (Software-level haversine distance filtering)
    if (searchQuery.latitude && searchQuery.longitude) {
      const { latitude, longitude, radius = 20 } = searchQuery;
      
      const isWithinRadius = (lat1: number, lon1: number, lat2: number, lon2: number, rad: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c <= rad;
      };

      if (shops.length > 0) {
        shops = shops.filter(shop => 
          isWithinRadius(latitude, longitude, shop.latitude, shop.longitude, Math.max(radius, shop.deliveryRadius || 20))
        );
      }

      if (products.length > 0) {
        products = products.filter(product => 
          isWithinRadius(latitude, longitude, product.shop.latitude, product.shop.longitude, Math.max(radius, product.shop.deliveryRadius || 20))
        );
      }

      if (services.length > 0) {
        services = services.filter(service => 
          isWithinRadius(latitude, longitude, service.shop.latitude, service.shop.longitude, Math.max(radius, service.shop.deliveryRadius || 20))
        );
      }
    }

    return {
      query,
      results: {
        products,
        shops,
        services,
      },
      pagination: {
        limit,
        offset,
      }
    };
  }
}
