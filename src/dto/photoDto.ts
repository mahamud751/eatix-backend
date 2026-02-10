import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PhotoDto {
  @IsString()
  @ApiProperty({ description: 'The title of the photo' })
  title: string;

  @IsString()
  @ApiProperty({ description: 'The source URL of the photo' })
  src: string;
}
