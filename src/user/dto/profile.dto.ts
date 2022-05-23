import { ApiProperty } from '@nestjs/swagger';
import { MediaItemDTO } from './media-item.dto';

export class ProfileDTO {
  @ApiProperty()
  readonly type: string;
  @ApiProperty()
  readonly text: string;
  @ApiProperty()
  readonly mediaItems: MediaItemDTO[];
  @ApiProperty()
  readonly createdAt: Date;
  @ApiProperty()
  readonly modifiedAt: Date;
}
