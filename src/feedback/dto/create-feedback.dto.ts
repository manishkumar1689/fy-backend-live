import { ApiProperty } from '@nestjs/swagger';
import { MediaItemDTO } from '../../user/dto/media-item.dto';

export class CreateFeedbackDTO {
  @ApiProperty()
  readonly user: string;

  @ApiProperty()
  readonly targetUser?: string;

  @ApiProperty()
  readonly key: string;

  @ApiProperty()
  readonly active: boolean;
  @ApiProperty()
  readonly reason?: string;

  @ApiProperty()
  readonly text: string;

  @ApiProperty()
  readonly deviceDetails?: string;

  @ApiProperty()
  readonly mediaItems: MediaItemDTO[];

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
