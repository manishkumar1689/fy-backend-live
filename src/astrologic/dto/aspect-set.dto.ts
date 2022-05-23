import { ApiProperty } from '@nestjs/swagger';
import { AspectItemDTO } from './aspect-item.dto';

export class AspectSetDTO {
  @ApiProperty()
  items: AspectItemDTO[];
  @ApiProperty()
  start?: number;
  @ApiProperty()
  limit?: number;
  @ApiProperty()
  protocolID?: string;
}
