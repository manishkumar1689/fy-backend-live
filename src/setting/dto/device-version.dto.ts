import { ApiProperty } from '@nestjs/swagger';

export class DeviceVersionDTO {
  @ApiProperty()
  readonly  key: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly version: string;

  @ApiProperty()
  readonly forceUpdate: boolean;
}
