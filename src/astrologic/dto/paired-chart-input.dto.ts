import { ApiProperty } from '@nestjs/swagger';
import { TagDTO } from './tag.dto';

/*
Simple DTO for core input data required to construct a chart
*/
export class PairedChartInputDTO {
  @ApiProperty()
  readonly user: string;

  @ApiProperty()
  readonly c1: string;

  @ApiProperty()
  readonly c2: string;

  @ApiProperty()
  readonly startYear?: number;

  @ApiProperty()
  readonly endYear?: number;

  @ApiProperty()
  readonly span?: number;

  @ApiProperty()
  readonly relType: string;

  @ApiProperty()
  readonly tags: TagDTO[];

  @ApiProperty()
  readonly notes: string;

  @ApiProperty()
  readonly mode: string;

  @ApiProperty()
  readonly isNew?: boolean;
}
