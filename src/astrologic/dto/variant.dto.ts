import { ApiProperty } from '@nestjs/swagger';

export class VariantDTO {
  @ApiProperty()
  readonly num: number; // ayanamsha ref number

  @ApiProperty()
  readonly sign?: number;

  @ApiProperty()
  readonly house?: number;

  @ApiProperty()
  readonly nakshatra?: number;

  @ApiProperty()
  readonly relationship: string;

  @ApiProperty()
  readonly charaKaraka?: string;
}
