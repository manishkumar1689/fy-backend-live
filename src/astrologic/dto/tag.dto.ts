import { ApiProperty } from '@nestjs/swagger';

export class TagDTO {
  @ApiProperty()
  readonly slug: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly vocab?: string;
}
