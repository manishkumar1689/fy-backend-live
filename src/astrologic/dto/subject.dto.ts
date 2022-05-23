import { ApiProperty } from '@nestjs/swagger';

export class SubjectDTO {
  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly notes?: string;

  @ApiProperty()
  readonly type: string;

  @ApiProperty()
  readonly gender: string;

  @ApiProperty()
  readonly eventType: string;

  @ApiProperty()
  readonly roddenValue?: number;

  @ApiProperty()
  readonly roddenScale?: string;

  @ApiProperty()
  readonly sources?: string[];

  @ApiProperty()
  readonly altNames?: string[];
}
