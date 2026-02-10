import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray } from 'class-validator';

export class CreateVariantDto {
  @ApiProperty({
    description: 'The name of the variant, e.g., "Color", "Size".',
    example: 'Color',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The options for the variant, e.g., ["Red", "Blue", "Green"].',
    type: [String],
    example: ['Red', 'Blue', 'Green'],
  })
  @IsArray()
  options: string[];
}
