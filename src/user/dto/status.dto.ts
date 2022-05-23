import { ApiProperty } from '@nestjs/swagger';
import { PaymentDTO } from './payment.dto';

export class StatusDTO {
  @ApiProperty()
  readonly role: string;

  @ApiProperty()
  readonly current: boolean;

  @ApiProperty()
  readonly payments: PaymentDTO[];

  @ApiProperty()
  readonly reason?: string;

  @ApiProperty()
  readonly expiresAt?: Date;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
