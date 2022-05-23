import { ApiProperty } from '@nestjs/swagger';

export class PaymentDTO {
  @ApiProperty()
  readonly service: string;

  @ApiProperty()
  readonly plan: string;

  @ApiProperty()
  readonly ref: string;

  @ApiProperty()
  readonly amount: number;

  @ApiProperty()
  readonly curr: string;

  @ApiProperty()
  readonly createdAt: Date;
}
