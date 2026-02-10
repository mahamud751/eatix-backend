import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { FileDetailDto } from 'src/dto/FileDetailsDto';

export class CreateDemoDto {
  @ApiProperty({ description: 'User name associated with the demo' })
  @IsString()
  @IsNotEmpty()
  userName: string;

  @ApiProperty({ description: 'Email associated with the demo' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    description: 'Details of the file associated with the advance product',
    type: [FileDetailDto],
  })
  @IsArray()
  @IsOptional()
  files?: FileDetailDto[];

  @ApiProperty({ description: 'ID of the advance related to the demo' })
  @IsString()
  @IsNotEmpty()
  advanceId: string;

  @ApiPropertyOptional({
    description: 'Status of the demo',
    enum: ['Pending', 'Processing', 'Approved', 'Canceled'],
  })
  @IsEnum(['Pending', 'Processing', 'Approved', 'Canceled'])
  @IsOptional()
  status?: string;
}
