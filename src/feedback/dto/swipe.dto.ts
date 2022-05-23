import { ApiProperty } from '@nestjs/swagger';

export class SwipeDTO {
  @ApiProperty()
  readonly from: string;

  @ApiProperty()
  readonly to: string;

  @ApiProperty()
  readonly value: number;

  @ApiProperty()
  readonly context?: string;
}
