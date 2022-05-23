import { ApiProperty } from '@nestjs/swagger';

export class ScoreDTO {
  @ApiProperty()
  readonly key: string;

  @ApiProperty()
  readonly value: number;
}
