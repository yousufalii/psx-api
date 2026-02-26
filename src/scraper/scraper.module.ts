import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { Stock } from './entities/stock.entity';
import { StockPriceHistory } from './entities/stock-price-history.entity';

import { MarketModule } from '../market/market.module';
import { PortfolioModule } from '../portfolio/portfolio.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stock, StockPriceHistory]),
    ScheduleModule.forRoot(),
    MarketModule,
    PortfolioModule,
  ],
  controllers: [ScraperController],
  providers: [ScraperService],
  exports: [ScraperService],
})
export class ScraperModule {}
