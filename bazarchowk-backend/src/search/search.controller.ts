import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search using PostgreSQL Full-Text Search' })
  @ApiResponse({ status: 200, description: 'Search results returned' })
  search(@Query() searchQuery: SearchQueryDto) {
    return this.searchService.search(searchQuery);
  }
}
