import { ApiProperty } from '@nestjs/swagger';

export class CreateFlagDTO {
  @ApiProperty()
  readonly user: string;

  @ApiProperty()
  readonly targetUser: any;

  @ApiProperty()
  readonly key: string;

  @ApiProperty()
  readonly active?: boolean;

  @ApiProperty()
  readonly type?: string;

  @ApiProperty()
  readonly value?: any;

  @ApiProperty()
  readonly isRating?: boolean;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
