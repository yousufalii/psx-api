import { Module } from '@nestjs/common';
import { MarketGateway } from './market.gateway';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [MarketGateway],
  exports: [MarketGateway],
})
export class MarketModule {}
