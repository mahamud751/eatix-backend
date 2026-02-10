import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';
import { FileDetailDto } from 'src/dto/FileDetailsDto';

export class CreateAdvanceDto {
  @ApiProperty({ description: 'Name of the advance product' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Number associated with the advance product' })
  @IsString()
  @IsNotEmpty()
  number: string;

  @ApiProperty({ description: 'Email associated with the advance product' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: 'List of student IDs' })
  @IsString()
  @IsOptional()
  students?: string;

  @ApiPropertyOptional({
    description: 'Ratio associated with the advance product',
  })
  @IsString()
  @IsOptional()
  ratio?: string;

  @ApiPropertyOptional({ description: 'Top part description' })
  @IsString()
  @IsOptional()
  topPart?: string;

  @ApiPropertyOptional({ description: 'Top fabric description' })
  @IsString()
  @IsOptional()
  topFab?: string;

  @ApiPropertyOptional({ description: 'Bottom part description' })
  @IsString()
  @IsOptional()
  bottomPart?: string;

  @ApiPropertyOptional({ description: 'Bottom fabric description' })
  @IsString()
  @IsOptional()
  bottomFab?: string;

  @ApiPropertyOptional({
    description: 'Address associated with the advance product',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'ID of the associated category' })
  @IsOptional()
  fileId: string;

  @ApiPropertyOptional({
    description: 'Quantity of the advance product',
  })
  @IsString()
  @IsOptional()
  quantity?: string;

  @ApiPropertyOptional({
    description: 'Details of the file associated with the advance product',
    type: [FileDetailDto],
  })
  @IsArray()
  @IsOptional()
  files?: FileDetailDto[];

  @ApiPropertyOptional({
    description: 'The status of the product',
    enum: ['pending', 'processing', 'approve', 'reject'],
  })
  @IsEnum(['pending', 'processing', 'approve', 'reject'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'List of vendor IDs associated with the advance',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  vendorIds?: string[];
}
