import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { StockHolding } from './entities/stock-holding.entity';
import { ScraperModule } from '../scraper/scraper.module';
import { Stock } from '../scraper/entities/stock.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, StockHolding, Stock]),
    ScraperModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
