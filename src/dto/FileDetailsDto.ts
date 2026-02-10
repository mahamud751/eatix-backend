import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class FileDetailDto {
  @ApiProperty({
    example: 'file-title',
    description: 'The title of the uploaded file',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    example: 'https://example.com/path/to/file',
    description: 'The source URL of the file',
  })
  @IsString()
  @IsOptional()
  src?: string;

  @ApiPropertyOptional({
    example: 'data:image/png;base64,iVBORw0KGg...',
    description: 'Base64 encoded string of the file',
  })
  @IsString()
  @IsOptional()
  base64?: string;

  @ApiProperty({
    example: 'some-unique-hash',
    description: 'A unique hash of the file source',
  })
  @IsString()
  @IsNotEmpty()
  srcHash: string;

  @ApiProperty({
    example: 'some-unique-id',
    description: 'Unique identifier of the file',
  })
  @IsString()
  @IsNotEmpty()
  id: string; // Change `any` to `string` if `id` is a string
}
