import { ApiProperty } from '@nestjs/swagger';

export class ITimeDTO {
  @ApiProperty()
  readonly year: number;

  @ApiProperty()
  readonly dayNum: number;

  @ApiProperty()
  readonly progress: number;

  @ApiProperty()
  readonly dayLength: number;

  @ApiProperty()
  readonly isDayTime: boolean;

  @ApiProperty()
  readonly dayBefore: boolean;

  @ApiProperty()
  readonly muhurta: number;

  @ApiProperty()
  readonly ghati: number;

  @ApiProperty()
  readonly vighati: number;

  @ApiProperty()
  readonly lipta: number;

  @ApiProperty()
  readonly weekDayNum?: number;
}
