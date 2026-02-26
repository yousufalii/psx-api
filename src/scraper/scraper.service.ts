import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import * as puppeteer from 'puppeteer';
import { Stock } from './entities/stock.entity';
import { StockPriceHistory } from './entities/stock-price-history.entity';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  // Mutex lock to prevent overlapping cron runs
  private isScraping = false;

  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(StockPriceHistory)
    private readonly stockPriceHistoryRepository: Repository<StockPriceHistory>,
  ) {}

  /**
   * Cron job that runs every 5 minutes.
   */
  @Cron('*/5 * * * *')
  async handleCron() {
    this.logger.log('Cron triggered: execution starting...');
    await this.runScraper();
  }

  /**
   * Main scraping logic using Puppeteer for dynamic JS rendering
   */
  async runScraper() {
    if (this.isScraping) {
      this.logger.warn('Scraping job is already running. Skipping execution.');
      return {
        status: 'skipped',
        message: 'Scraper already in progress to prevent overlap.',
      };
    }

    const startTime = Date.now();
    this.isScraping = true;
    let browser: puppeteer.Browser | null = null;

    let totalStocksScraped = 0;
    let newStocksInserted = 0;
    let priceRecordsInserted = 0;

    try {
      this.logger.log('Launching Puppeteer browser...');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Target PSX DPS base URL (or specific screener page if known)
      const TARGET_URL = 'https://dps.psx.com.pk';
      this.logger.log(`Navigating to ${TARGET_URL}...`);

      await page.goto(TARGET_URL, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      // PSX DPS uses DataTables which defaults to 25 entries.
      // We need to select "-1" (All) to get everything.
      try {
        const selectSelector = 'select[name$="_length"]'; // Matches DataTables_Table_0_length etc.
        await page.waitForSelector(selectSelector, { timeout: 10000 });
        await page.select(selectSelector, '-1');

        // Wait a bit for the table to update
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await page.waitForSelector('table tbody tr', { timeout: 10000 });
      } catch (e) {
        this.logger.warn(
          `Could not find or select 'All' entries dropdown. Proceeding with default view. Error: ${e.message}`,
        );
      }

      // Gather stocks with raw evaluate in the headless browser.
      // Adjust the selectors based on the actual PSX DPS DOM structure!
      const discoveredStocks = await page.evaluate(() => {
        // Example logic targets general table structure
        // This should be calibrated to the specific dps.psx.com.pk structure
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        const results: { symbol: string; name: string; price: number }[] = [];

        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('td'));

          if (cells.length >= 6) {
            const symbolLink = cells[0]?.querySelector('a');
            const symbol =
              symbolLink?.innerText.trim() || cells[0]?.innerText.trim() || '';

            // PSX DPS stores the full company name in the data-title attribute of the symbol link
            const name = symbolLink?.getAttribute('data-title') || symbol;

            // Cell 5 is the 'Current' price in the Market Summary table
            const priceText = cells[5]?.innerText.trim() || '0';
            const price = parseFloat(priceText.replace(/,/g, ''));

            if (symbol && !isNaN(price) && price > 0) {
              results.push({ symbol, name, price });
            }
          }
        }
        return results;
      });

      // Gracefully close main scraper page
      await page.close();

      totalStocksScraped = discoveredStocks.length;
      this.logger.log(`Discovered ${totalStocksScraped} valid stock records.`);

      // Limit concurrent processing natively using chunks and Promise.all
      // Note: If you have to scrape individual pages for each stock,
      // you would open a new page per stock inside the `batch.map()` logic concurrently.
      const CONCURRENCY_LIMIT = 10;
      for (let i = 0; i < discoveredStocks.length; i += CONCURRENCY_LIMIT) {
        const batch = discoveredStocks.slice(i, i + CONCURRENCY_LIMIT);

        await Promise.all(
          batch.map(async (stockItem) => {
            try {
              // 1. If stock does not exist -> insert it
              let stock = await this.stockRepository.findOne({
                where: { symbol: stockItem.symbol },
              });

              if (!stock) {
                stock = this.stockRepository.create({
                  symbol: stockItem.symbol,
                  name: stockItem.name,
                });
                await this.stockRepository.save(stock);
                newStocksInserted++;
              }

              // 2. Always insert a new StockPriceHistory record (append-only)
              const priceHistory = this.stockPriceHistoryRepository.create({
                stock, // TypeORM relates this behind the scenes
                price: stockItem.price,
              });

              await this.stockPriceHistoryRepository.save(priceHistory);
              priceRecordsInserted++;
            } catch (err) {
              // Handle error gracefully - continue execution
              this.logger.error(
                `Failed to process data for stock ${stockItem.symbol}: ${err.message}`,
              );
            }
          }),
        );
      }
    } catch (error) {
      // Handle network or scraping errors gracefully
      this.logger.error(
        `Exception occurred during scraping process: ${error.message}`,
        error.stack,
      );
    } finally {
      // Ensure browser is always closed avoiding memory leaks
      if (browser) {
        this.logger.log('Shutting down local browser instance...');
        await browser
          .close()
          .catch((err) =>
            this.logger.error('Failed to close browser', err.stack),
          );
      }

      // Release Mutex lock
      this.isScraping = false;
      const executionTimeMs = Date.now() - startTime;
      this.logger.log(`Scraper execution completed in ${executionTimeMs}ms`);

      return {
        totalStocksScraped,
        newStocksInserted,
        priceRecordsInserted,
        executionTimeMs,
      };
    }
  }

  /**
   * Fetches the latest price for a given stock symbol.
   */
  async getLatestPrice(symbol: string): Promise<number> {
    const stock = await this.stockRepository.findOne({
      where: { symbol },
      relations: ['priceHistories'],
    });

    if (!stock) {
      throw new Error(`Stock with symbol ${symbol} not found`);
    }

    if (!stock.priceHistories || stock.priceHistories.length === 0) {
      return 0;
    }

    // Sort by fetchedAt descending to get the latest
    const latest = stock.priceHistories.sort(
      (a, b) => b.fetchedAt.getTime() - a.fetchedAt.getTime(),
    )[0];

    return Number(latest.price);
  }
}
