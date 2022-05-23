import { ApiProperty } from '@nestjs/swagger';

export class CreateFeedbackDTO {
  @ApiProperty()
  readonly user: string;

  @ApiProperty()
  readonly targetUser: any;

  @ApiProperty()
  readonly key: string;

  @ApiProperty()
  readonly active: boolean;

  @ApiProperty()
  readonly text: String;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
