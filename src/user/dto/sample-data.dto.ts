import { ApiProperty } from '@nestjs/swagger';
import { SampleRecordDTO } from './sample-record.dto';

export class SampleDataDTO {
  @ApiProperty()
  readonly items: SampleRecordDTO[];
}
