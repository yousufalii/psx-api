import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { Logger, UseFilters } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/market',
  cors: { origin: '*' },
})
export class MarketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MarketGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.auth?.token;
      if (!authHeader) {
        this.logger.warn(`Client connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      const token = authHeader.split(' ')[1] || authHeader;
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'secretKey',
      });

      const user = await this.usersService.findOneById(payload.sub);
      if (!user || !user.isActive) {
        this.logger.warn(`Client connection rejected: Invalid user`);
        client.disconnect();
        return;
      }

      // Join user-specific room for targeted broadcasting
      client.join(`user:${user.id}`);
      this.logger.log(
        `Client connected: ${user.email} (${client.id}) - Joined room: user:${user.id}`,
      );
    } catch (e) {
      this.logger.error(`Connection authentication failed: ${e.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() symbol: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (symbol) {
      client.join(symbol);
      this.logger.log(`Client ${client.id} subscribed to room: ${symbol}`);
      return { event: 'subscribed', data: symbol };
    }
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() symbol: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (symbol) {
      client.leave(symbol);
      this.logger.log(`Client ${client.id} unsubscribed from room: ${symbol}`);
      return { event: 'unsubscribed', data: symbol };
    }
  }

  /**
   * Broadcasts a price update to all clients in the symbol's room
   */
  broadcastPriceUpdate(payload: {
    symbol: string;
    price: number;
    fetchedAt: Date;
  }) {
    this.server.to(payload.symbol).emit('stockPriceUpdate', payload);
  }
}
