import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('portfolio_snapshots')
export class PortfolioSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalValue: number;

  @UpdateDateColumn()
  lastUpdatedAt: Date;
}
