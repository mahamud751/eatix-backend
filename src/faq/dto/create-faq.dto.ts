import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class CreateFaqDto {
  @ApiProperty({ description: 'Name of the faq' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Description of the faq' })
  @IsString()
  @IsNotEmpty()
  desc: string;

  @ApiProperty({ description: 'Position of the faq' })
  @IsString()
  @IsNotEmpty()
  position: string;

  @ApiPropertyOptional({
    description: 'The status of the faq',
    enum: ['active', 'inActive'],
  })
  @IsEnum(['active', 'inActive'])
  @IsOptional()
  status?: string;
}
