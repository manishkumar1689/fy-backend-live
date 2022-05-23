import { ApiProperty } from '@nestjs/swagger';

export class CategoryDTO {
  @ApiProperty()
  readonly key: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly maxScore: number;
}
