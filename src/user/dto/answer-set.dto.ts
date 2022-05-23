import { ApiProperty } from '@nestjs/swagger';
import { AnswerDTO } from './answer.dto';

export class AnswerSetDTO {
  @ApiProperty()
  readonly user: string;

  @ApiProperty()
  readonly type: string;

  @ApiProperty()
  readonly answers: AnswerDTO[];

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
