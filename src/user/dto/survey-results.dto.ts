import { ApiProperty } from '@nestjs/swagger';
import { ResultValueDTO } from './result-value.dto';

export class SurveyResultsDTO {
  @ApiProperty()
  readonly type: string;

  @ApiProperty()
  readonly values: ResultValueDTO[];
}
