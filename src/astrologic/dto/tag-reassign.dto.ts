import { ApiProperty } from '@nestjs/swagger';
import { TagDTO } from './tag.dto';

export class TagReassignDTO {
  @ApiProperty()
  readonly source: TagDTO; // tag to be removed

  @ApiProperty()
  readonly target?: TagDTO; // replacement tag if any

  @ApiProperty()
  readonly years?: number; // optionally set a duration based on a source tag

  @ApiProperty()
  readonly notes?: boolean; // append tag display text (name) to notes

  @ApiProperty()
  readonly remove?: boolean; // remove tag without a replacement
}
