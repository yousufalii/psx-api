import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ScraperService } from '../scraper/scraper.service';

import { PortfolioSnapshot } from './entities/portfolio-snapshot.entity';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PortfolioSnapshot)
    private readonly snapshotRepository: Repository<PortfolioSnapshot>,
    private readonly scraperService: ScraperService,
  ) {}

  async calculatePortfolio(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['holdings', 'holdings.stock'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    let totalPortfolioValue = 0;
    const holdingsData = await Promise.all(
      user.holdings.map(async (holding) => {
        let currentPrice = 0;
        try {
          currentPrice = await this.scraperService.getLatestPrice(
            holding.stock.symbol,
          );
        } catch (e) {
          // Fallback if price history is missing
        }
        const value = Number(holding.quantity) * currentPrice;
        totalPortfolioValue += value;

        return {
          symbol: holding.stock.symbol,
          quantity: Number(holding.quantity),
          purchasePrice: Number(holding.purchasePrice),
          currentPrice,
          value,
        };
      }),
    );

    const holdingsWithWeightage = holdingsData.map((h) => ({
      ...h,
      weightage:
        totalPortfolioValue > 0 ? (h.value / totalPortfolioValue) * 100 : 0,
    }));

    // Update snapshot for delta calculations
    await this.updateSnapshot(user, totalPortfolioValue);

    return {
      userId: user.id,
      totalPortfolioValue,
      holdings: holdingsWithWeightage,
      updatedAt: new Date(),
    };
  }

  async updateSnapshot(user: User, totalValue: number) {
    let snapshot = await this.snapshotRepository.findOne({
      where: { user: { id: user.id } },
    });

    if (!snapshot) {
      snapshot = this.snapshotRepository.create({
        user,
        totalValue,
      });
    } else {
      snapshot.totalValue = totalValue;
    }

    return this.snapshotRepository.save(snapshot);
  }

  async getSnapshot(userId: string): Promise<PortfolioSnapshot | null> {
    return this.snapshotRepository.findOne({
      where: { user: { id: userId } },
    });
  }
}
