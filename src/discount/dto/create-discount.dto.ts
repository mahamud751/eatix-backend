import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsArray,
  IsDate,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PhotoDto } from 'src/dto/photoDto';

export class CreateDiscountDto {
  @ApiProperty({ description: 'The name of the discount' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'The code of the code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'The code of the details' })
  @IsString()
  details: string;

  @ApiProperty({ description: 'The code of the percentenge' })
  @IsString()
  percentenge: string;

  @ApiPropertyOptional({
    description: 'Array of photo objects',
    type: [PhotoDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhotoDto)
  @IsOptional()
  photos?: PhotoDto[];

  @ApiProperty({ description: 'The discount amount' })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ description: 'The discount min amount' })
  @IsString()
  @IsNotEmpty()
  min: string;

  @ApiProperty({ description: 'The start date of the discount' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({ description: 'The end date of the discount' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  endDate: Date;

  @ApiPropertyOptional({
    description: 'The status of the discount',
    enum: ['active', 'inactive'],
  })
  @IsEnum(['active', 'inactive'])
  @IsOptional()
  status?: string;
}
