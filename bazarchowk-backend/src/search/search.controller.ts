import { Controller, Get, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Global search using PostgreSQL Full-Text Search' })
  @ApiResponse({ status: 200, description: 'Search results returned' })
  search(@Query() searchQuery: SearchQueryDto, @Req() req: any) {
    const userId = req.user?.userId || null;
    return this.searchService.search(searchQuery, userId);
  }
}
