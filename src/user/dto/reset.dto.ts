import { ApiProperty } from '@nestjs/swagger';

export class ResetDTO {
  @ApiProperty()
  readonly ts: number;
  readonly value?: number;
}
