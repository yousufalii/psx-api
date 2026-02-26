import { Controller, Post } from '@nestjs/common';
import { ScraperService } from './scraper.service';

import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('scraper')
@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post('run')
  @ApiOperation({ summary: 'Manually trigger the scraper' })
  @ApiResponse({ status: 200, description: 'The scraper execution results.' })
  async runScraperManually() {
    return this.scraperService.runScraper();
  }
}
