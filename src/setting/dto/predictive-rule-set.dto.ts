import { ApiProperty } from '@nestjs/swagger';
import { PredictiveScoreDTO } from './predictive-score.dto';

export class PredictiveRuleSetDTO {

  @ApiProperty()
  readonly user: string;

  @ApiProperty()
  readonly active: boolean;

  @ApiProperty()
  readonly type: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly text: string;

  @ApiProperty()
  readonly notes: string;

  @ApiProperty()
  readonly conditionSet: any;

  @ApiProperty()
  readonly scores: PredictiveScoreDTO[];

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
