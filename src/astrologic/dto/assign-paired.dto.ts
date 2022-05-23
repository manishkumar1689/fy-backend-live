import { ApiProperty } from '@nestjs/swagger';
import { TagDTO } from './tag.dto';

export class AssignPairedDTO {
  @ApiProperty()
  id: string;
  @ApiProperty()
  paired: string[];
  @ApiProperty()
  links?: string[];
  @ApiProperty()
  relType?: string;
  @ApiProperty()
  tags?: TagDTO[];
  @ApiProperty()
  startYear?: number;
  @ApiProperty()
  endYear?: number;
  @ApiProperty()
  span?: number;
}
