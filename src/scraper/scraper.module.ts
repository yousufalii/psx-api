import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { ScraperService } from "./scraper.service";
import { ScraperController } from "./scraper.controller";
import { Stock } from "./entities/stock.entity";
import { StockPriceHistory } from "./entities/stock-price-history.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Stock, StockPriceHistory]),
    ScheduleModule.forRoot(),
  ],
  controllers: [ScraperController],
  providers: [ScraperService],
  exports: [ScraperService],
})
export class ScraperModule {}
