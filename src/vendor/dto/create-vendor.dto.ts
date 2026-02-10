import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { VendorStatus } from '@prisma/client'; // Import the enum from Prisma

export class CreateVendorDto {
  @ApiProperty({ description: 'Name of the vendor' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Vendor number' })
  @IsString()
  number: string;

  @ApiProperty({ description: 'Vendor email' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'Vendor address' })
  @IsString()
  address: string;

  @ApiProperty({
    description: 'Status of the vendor',
    enum: VendorStatus,
    default: VendorStatus.pending,
  })
  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;
}
