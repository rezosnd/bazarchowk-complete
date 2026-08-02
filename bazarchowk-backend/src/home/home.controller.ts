import { Controller, Get, Param } from '@nestjs/common';
import { HomeService } from './home.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Home Feed')
@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('feed/:cityId')
  @ApiOperation({ summary: 'Get aggregated home feed with caching' })
  getCityHomeFeed(@Param('cityId') cityId: string) {
    return this.homeService.getCityHomeFeed(cityId);
  }
}
