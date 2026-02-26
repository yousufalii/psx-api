import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { StockPriceHistory } from "./stock-price-history.entity";

@Entity("stocks")
export class Stock {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  symbol: string;

  @Column()
  name: string;

  @OneToMany(() => StockPriceHistory, (history) => history.stock, {
    cascade: true,
  })
  priceHistories: StockPriceHistory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
