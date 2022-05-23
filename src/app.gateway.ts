import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'net';
import { socketIoPort } from './.config';

@WebSocketGateway(socketIoPort)
export class AppGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ): string {
    return 'Hello world!';
  }
}
