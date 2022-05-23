import { ApiProperty } from '@nestjs/swagger';

export class RemoveStatusDTO {
  @ApiProperty()
  readonly user: string;
  @ApiProperty()
  readonly role: string;
}
