import { ApiProperty } from '@nestjs/swagger';

export class ActiveStatusDTO {
  
  @ApiProperty()
  readonly active: boolean;

  @ApiProperty()
  readonly reason: string;

  @ApiProperty()
  readonly expiryDate?: Date;

  @ApiProperty()
  readonly removeBlockHistory?: boolean;
}
