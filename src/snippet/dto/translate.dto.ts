import { ApiProperty } from '@nestjs/swagger';

export class TranslateDTO {
  @ApiProperty()
  readonly from: string;
  
  @ApiProperty()
  readonly to: string;

  @ApiProperty()
  readonly text: string;

  @ApiProperty()
  readonly source?: string;

}
