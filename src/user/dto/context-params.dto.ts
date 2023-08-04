import { ApiProperty } from '@nestjs/swagger';

export class ContextParamsDTO {
  @ApiProperty()
  user: string;
  @ApiProperty()
  excludeIds?: string[];
  @ApiProperty()
  context: string;
  @ApiProperty()
  max?: number;
}
