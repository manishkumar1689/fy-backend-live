import { ApiProperty } from '@nestjs/swagger';

/*
Simple DTO for core input data required to construct a chart
with many optional fields depending on context
*/

export interface SimpleGeo {
  lat: number;
  lng: number;
  alt?: number;
}

export interface SimplePlacename {
  fullName?: string;
  name?: string;
  type?: string;
  geo?: SimpleGeo;
}

export class ChartInputDTO {
  @ApiProperty()
  readonly _id?: string;

  @ApiProperty()
  readonly user: string;

  @ApiProperty()
  readonly parent?: string;

  @ApiProperty()
  readonly datetime: string;

  @ApiProperty()
  readonly lat: number;

  @ApiProperty()
  readonly lng: number;

  @ApiProperty()
  readonly alt: number;

  @ApiProperty()
  readonly isDefaultBirthChart: boolean;

  @ApiProperty()
  readonly name?: string;

  @ApiProperty()
  readonly notes?: string;

  @ApiProperty()
  readonly type?: string;

  @ApiProperty()
  readonly status?: string;

  @ApiProperty()
  readonly gender?: string;

  @ApiProperty()
  readonly eventType?: string;

  @ApiProperty()
  readonly roddenValue?: number;

  @ApiProperty()
  readonly locality?: string;

  @ApiProperty()
  readonly pob?: string; // full search place name as entered, not just the locality

  @ApiProperty()
  readonly tzOffset?: number;

  @ApiProperty()
  readonly tz?: string;

  @ApiProperty()
  readonly placenames?: SimplePlacename;

  @ApiProperty()
  readonly altNames?: string[];

  @ApiProperty()
  readonly sources?: string[];
}
