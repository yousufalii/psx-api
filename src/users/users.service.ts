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
import { PortfolioService } from '../portfolio/portfolio.service';

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
    private readonly portfolioService: PortfolioService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'role', 'isActive', 'name'],
    });
  }

  async findOneById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
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
    return this.portfolioService.calculatePortfolio(userId);
  }
}
