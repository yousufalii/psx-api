import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { StockHolding } from '../users/entities/stock-holding.entity';
import { PortfolioService } from './portfolio.service';
import { PortfolioRecalculationService } from './portfolio-recalculation.service';
import { ScraperModule } from '../scraper/scraper.module';
import { MarketModule } from '../market/market.module';

import { PortfolioSnapshot } from './entities/portfolio-snapshot.entity';
import { DeltaRecalculationService } from './delta-recalculation.service';
import { StockPriceHistory } from '../scraper/entities/stock-price-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      StockHolding,
      PortfolioSnapshot,
      StockPriceHistory,
    ]),
    ScraperModule,
    MarketModule,
  ],
  providers: [
    PortfolioService,
    PortfolioRecalculationService,
    DeltaRecalculationService,
  ],
  exports: [
    PortfolioService,
    PortfolioRecalculationService,
    DeltaRecalculationService,
  ],
})
export class PortfolioModule {}
