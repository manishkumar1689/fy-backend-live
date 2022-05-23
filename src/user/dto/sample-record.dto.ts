import { ApiProperty } from '@nestjs/swagger';

interface Related {
  text: string;
  href: string;
}

export class SampleRecordDTO {
  @ApiProperty()
  readonly url: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly birthname: string;

  @ApiProperty()
  readonly rodden: string;

  @ApiProperty()
  readonly dob: string;

  @ApiProperty()
  readonly gender: string;

  @ApiProperty()
  readonly latLng: string;

  @ApiProperty()
  readonly related: Related[];
}
