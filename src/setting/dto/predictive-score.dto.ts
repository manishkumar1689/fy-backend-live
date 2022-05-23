import { ApiProperty } from '@nestjs/swagger';

export class PredictiveScoreDTO {
  @ApiProperty()
  readonly key: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly value: number;

  @ApiProperty()
  readonly maxScore: number;
}
