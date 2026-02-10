import { IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PhotoDto } from 'src/dto/photoDto';

export class CreateBusinessBannerDto {
  @ApiPropertyOptional({
    description: 'Array of photo objects',
    type: [PhotoDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhotoDto)
  @IsOptional()
  banners?: PhotoDto[];

  @ApiPropertyOptional({
    description: 'The status of the product',
    enum: ['active', 'inActive'],
  })
  @IsEnum(['active', 'inActive'])
  @IsOptional()
  status?: string;
}
