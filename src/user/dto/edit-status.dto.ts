import { ApiProperty } from '@nestjs/swagger';
import { PaymentDTO } from './payment.dto';

export class EditStatusDTO {
  @ApiProperty()
  readonly user: string;
  @ApiProperty()
  readonly role: string;

  @ApiProperty()
  readonly paymentOption?: string;

  @ApiProperty()
  readonly payment?: PaymentDTO;

  @ApiProperty()
  readonly expiryDate?: Date;
}
