import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { StockHolding } from './entities/stock-holding.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateHoldingDto } from './dto/create-holding.dto';
import { UpdateHoldingDto } from './dto/update-holding.dto';
import { ScraperService } from '../scraper/scraper.service';
import { Stock } from '../scraper/entities/stock.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(StockHolding)
    private readonly holdingRepository: Repository<StockHolding>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    private readonly scraperService: ScraperService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async getUser(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['holdings', 'holdings.stock'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async addStockHolding(
    userId: string,
    createHoldingDto: CreateHoldingDto,
  ): Promise<StockHolding> {
    const user = await this.getUser(userId);
    const stock = await this.stockRepository.findOne({
      where: { symbol: createHoldingDto.stockSymbol },
    });

    if (!stock) {
      throw new NotFoundException(
        `Stock with symbol ${createHoldingDto.stockSymbol} not found`,
      );
    }

    const holding = this.holdingRepository.create({
      ...createHoldingDto,
      user,
      stock,
    });

    return this.holdingRepository.save(holding);
  }

  async updateStockHolding(
    id: string,
    updateHoldingDto: UpdateHoldingDto,
  ): Promise<StockHolding> {
    const holding = await this.holdingRepository.findOne({ where: { id } });
    if (!holding) {
      throw new NotFoundException(`Stock holding with ID ${id} not found`);
    }

    Object.assign(holding, updateHoldingDto);
    return this.holdingRepository.save(holding);
  }

  async removeStockHolding(id: string): Promise<void> {
    const result = await this.holdingRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Stock holding with ID ${id} not found`);
    }
  }

  async getPortfolio(userId: string) {
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

    return {
      userId: user.id,
      totalPortfolioValue,
      holdings: holdingsWithWeightage,
    };
  }
}
