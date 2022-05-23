import { ApiProperty } from '@nestjs/swagger';
import { CategoryDTO } from './category.dto';
import { ConfigOptionDTO } from './config-option.dto';
import { RulesCollectionDTO } from './rules-collection.dto';

export class ProtocolDTO {
  @ApiProperty()
  readonly user: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly notes?: string;

  @ApiProperty()
  readonly collections: RulesCollectionDTO[];

  @ApiProperty()
  readonly categories: CategoryDTO[];

  @ApiProperty()
  readonly settings: ConfigOptionDTO[];

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
