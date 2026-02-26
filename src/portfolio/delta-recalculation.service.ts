import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { StockHolding } from '../users/entities/stock-holding.entity';
import { StockPriceHistory } from '../scraper/entities/stock-price-history.entity';
import { PortfolioSnapshot } from './entities/portfolio-snapshot.entity';
import { MarketGateway } from '../market/market.gateway';
import { PortfolioService } from './portfolio.service';

@Injectable()
export class DeltaRecalculationService {
  private readonly logger = new Logger(DeltaRecalculationService.name);

  constructor(
    @InjectRepository(StockHolding)
    private readonly holdingRepository: Repository<StockHolding>,
    @InjectRepository(StockPriceHistory)
    private readonly priceHistoryRepository: Repository<StockPriceHistory>,
    @InjectRepository(PortfolioSnapshot)
    private readonly snapshotRepository: Repository<PortfolioSnapshot>,
    private readonly portfolioService: PortfolioService,
    private readonly marketGateway: MarketGateway,
  ) {}

  async handleStockPriceUpdate(
    stockId: string,
    newPrice: number,
    symbol: string,
  ) {
    try {
      // 1. Get previous price to calculate delta
      const previousPrices = await this.priceHistoryRepository.find({
        where: { stock: { id: stockId } },
        order: { fetchedAt: 'DESC' },
        take: 2,
      });

      if (previousPrices.length < 2) {
        this.logger.log(
          `Not enough price history for delta calculation on ${symbol}. Falling back to full recalculation.`,
        );
        return this.fallbackToFullRecalculation(stockId);
      }

      const prevPrice = Number(previousPrices[1].price);
      const delta = newPrice - prevPrice;

      if (delta === 0) return;

      // 2. Find all unique users holding this stock
      const holdings = await this.holdingRepository.find({
        where: { stock: { id: stockId } },
        relations: ['user'],
      });

      const userIds = [...new Set(holdings.map((h) => h.user.id))];
      if (userIds.length === 0) return;

      // 3. Update snapshots and emit events
      await Promise.all(
        userIds.map(async (userId) => {
          try {
            const userHoldings = holdings.filter((h) => h.user.id === userId);
            const totalQuantity = userHoldings.reduce(
              (sum, h) => sum + Number(h.quantity),
              0,
            );
            const userDelta = totalQuantity * delta;

            let snapshot = await this.portfolioService.getSnapshot(userId);

            if (!snapshot) {
              // Fallback to full recalculation if no snapshot exists
              const fullPortfolio =
                await this.portfolioService.calculatePortfolio(userId);
              this.marketGateway.server
                .to(`user:${userId}`)
                .emit('portfolioUpdate', fullPortfolio);
              return;
            }

            // Update snapshot
            snapshot.totalValue = Number(snapshot.totalValue) + userDelta;
            if (snapshot.totalValue < 0) snapshot.totalValue = 0;
            await this.snapshotRepository.save(snapshot);

            // Emit delta-based update
            this.marketGateway.server
              .to(`user:${userId}`)
              .emit('portfolioUpdate', {
                userId,
                delta: userDelta,
                newTotalPortfolioValue: snapshot.totalValue,
                updatedStock: {
                  symbol,
                  newPrice,
                  priceDelta: delta,
                },
                updatedAt: new Date(),
              });
          } catch (err) {
            this.logger.error(
              `Failed delta update for user ${userId}: ${err.message}`,
            );
          }
        }),
      );
    } catch (error) {
      this.logger.error(`Error in delta recalculation: ${error.message}`);
    }
  }

  private async fallbackToFullRecalculation(stockId: string) {
    const holdings = await this.holdingRepository.find({
      where: { stock: { id: stockId } },
      relations: ['user'],
    });
    const userIds = [...new Set(holdings.map((h) => h.user.id))];

    await Promise.all(
      userIds.map(async (userId) => {
        const portfolio =
          await this.portfolioService.calculatePortfolio(userId);
        this.marketGateway.server
          .to(`user:${userId}`)
          .emit('portfolioUpdate', portfolio);
      }),
    );
  }
}
