import {
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class Rate {
  @ApiProperty({ example: 'shipping', description: 'Name of the rate option' })
  @IsString()
  name: string;

  @ApiProperty({
    example:
      'সেলের শিপমেন্ট ২৫.০৩.২০২৫ ইং হতে বন্ধ থাকবে। সম্মানিত কাস্টমারগণকে সেলের আগেই অর্ডার করুন।',
    description: 'Description of the rate',
  })
  @IsString()
  desc: string;
}

export class CreateShippingDto {
  @ApiProperty({
    type: [Rate],
    example: [
      {
        name: 'shipping',
        desc: 'সেলের শিপমেন্ট ২৫.০৩.২০২৫ ইং হতে বন্ধ থাকবে। সম্মানিত কাস্টমারগণকে সেলের আগেই অর্ডার করুন।',
      },
      {
        name: 'air',
        desc: '.০৩.২০২৫ ইং হতে বন্ধ থাকবে। সম্মানিত কাস্টমারগণকে সেলের আগেই অর্ডার করুন।',
      },
      {
        name: 'sea',
        desc: '০৩.২০২৫ ইং হতে বন্ধ থাকবে। সম্মানিত কাস্টমারগণকে সেলের আগেই অর্ডার করুন।',
      },
    ],
    description: 'Array of rate objects with name and desc',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Rate)
  rates: Rate[];

  @ApiProperty({
    example: 'active',
    description: 'Status of the shipping option',
    required: false,
  })
  @IsString()
  @IsOptional()
  status?: string;
}
