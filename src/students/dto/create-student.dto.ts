import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiProperty({ description: 'The name of the student' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'The class of the student' })
  @IsNotEmpty()
  @IsString()
  class: string;

  @ApiProperty({ description: 'The mobile number of the student' })
  @IsNotEmpty()
  @IsString()
  mobile: string;

  @ApiProperty({ description: 'The total marks of the student' })
  @IsNotEmpty()
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'The category of the student' })
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiProperty({ description: 'The height of the student' })
  @IsNotEmpty()
  @IsNumber()
  height: number;

  @ApiProperty({ description: 'The shoulder measurement of the student' })
  @IsNotEmpty()
  @IsNumber()
  shoulder: number;

  @ApiProperty({ description: 'The sleeve length of the student' })
  @IsNotEmpty()
  @IsNumber()
  sleeveLength: number;

  @ApiProperty({ description: 'The collar measurement of the student' })
  @IsNotEmpty()
  @IsNumber()
  collar: number;

  @ApiProperty({ description: 'The length measurement of the student' })
  @IsNotEmpty()
  @IsNumber()
  length: number;

  @ApiProperty({ description: 'The armhole measurement of the student' })
  @IsNotEmpty()
  @IsNumber()
  armhole: number;

  @ApiProperty({ description: 'The sleeve opening measurement of the student' })
  @IsNotEmpty()
  @IsNumber()
  sleeveOpening: number;

  @ApiProperty({ description: 'The waist measurement of the student' })
  @IsNotEmpty()
  @IsNumber()
  waist: number;

  @ApiProperty({ description: 'The waist size (numeric) of the student' })
  @IsOptional()
  @IsNumber()
  waistSize?: number;

  @ApiProperty({ description: 'The half body measurement of the student' })
  @IsOptional()
  @IsNumber()
  halfBody?: number;

  @ApiProperty({ description: 'The bottom hem measurement of the student' })
  @IsOptional()
  @IsNumber()
  bottomHem?: number;

  @ApiProperty({ description: 'The hips measurement of the student' })
  @IsOptional()
  @IsNumber()
  hips?: number;

  @ApiProperty({ description: 'The ID of the school the student belongs to' })
  @IsNotEmpty()
  @IsString()
  schoolId: string;

  @ApiPropertyOptional({
    description: 'The status of the product',
    enum: ['active', 'inActive'],
  })
  @IsEnum(['active', 'inActive'])
  @IsOptional()
  status?: string;
}
