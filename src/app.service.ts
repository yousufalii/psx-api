import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'PSX DPS Scraper is running! Trigger scraper via POST /scraper/run';
  }
}
