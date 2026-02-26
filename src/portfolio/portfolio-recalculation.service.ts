import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockHolding } from '../users/entities/stock-holding.entity';
import { PortfolioService } from './portfolio.service';
import { MarketGateway } from '../market/market.gateway';

@Injectable()
export class PortfolioRecalculationService {
  private readonly logger = new Logger(PortfolioRecalculationService.name);

  constructor(
    @InjectRepository(StockHolding)
    private readonly holdingRepository: Repository<StockHolding>,
    private readonly portfolioService: PortfolioService,
    private readonly marketGateway: MarketGateway,
  ) {}

  /**
   * Identifies all users holding the updated stock and triggers portfolio recalculation
   */
  async handleStockPriceUpdate(stockId: string) {
    try {
      // 1. Find all unique users holding this stock
      const holdings = await this.holdingRepository.find({
        where: { stock: { id: stockId } },
        relations: ['user'],
      });

      const userIds = [...new Set(holdings.map((h) => h.user.id))];

      if (userIds.length === 0) return;

      this.logger.log(
        `Recalculating portfolios for ${userIds.length} users affected by stock update...`,
      );

      // 2. For each user, recalculate and emit via WebSocket
      // Using Promise.all with batching if necessary, but for now direct Map is fine for moderate user counts
      await Promise.all(
        userIds.map(async (userId) => {
          try {
            const portfolio =
              await this.portfolioService.calculatePortfolio(userId);

            // 3. Emit to user-specific room
            this.marketGateway.server
              .to(`user:${userId}`)
              .emit('portfolioUpdate', portfolio);
          } catch (err) {
            this.logger.error(
              `Failed to recalculate portfolio for user ${userId}: ${err.message}`,
            );
          }
        }),
      );
    } catch (error) {
      this.logger.error(
        `Error during portfolio recalculation process: ${error.message}`,
      );
    }
  }
}
