import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Stock } from "./stock.entity";

@Entity("stock_price_history")
export class StockPriceHistory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Stock, (stock) => stock.priceHistories, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "stockId" })
  stock: Stock;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  price: number;

  @CreateDateColumn({ type: "timestamp with time zone" })
  fetchedAt: Date;
}
