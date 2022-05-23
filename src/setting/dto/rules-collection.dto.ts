import { ApiProperty } from '@nestjs/swagger';
import { CategoryDTO } from './category.dto';
import { RuleSetDTO } from './rule-set.dto';

export class RulesCollectionDTO {
  @ApiProperty()
  readonly type: string;

  @ApiProperty()
  readonly rules: RuleSetDTO[];

  @ApiProperty()
  readonly percent: number;
}
