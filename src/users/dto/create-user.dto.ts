// backend/src/users/dto/create-user.dto.ts
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PhotoDto } from 'src/dto/photoDto';
import { Type } from 'class-transformer';
import { UserStatus } from '@prisma/client';
import { IsBangladeshPhoneNumber } from './phone-number-validation';

export class CreateUserDto {
  @ApiPropertyOptional({ description: 'The name of the user' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'The employee ID' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ description: 'The email of the user' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'The phone number of the user' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'The password of the user' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    description: 'The role of the user',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    description: 'Array of photo objects',
    type: [PhotoDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhotoDto)
  @IsOptional()
  photos?: PhotoDto[];

  @ApiPropertyOptional({ description: 'The address of the user' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'The branch of the user' })
  @IsString()
  @IsOptional()
  branch?: string;

  @ApiPropertyOptional({ description: 'The department of the user' })
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'The category of the user' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'The status of the user',
    enum: UserStatus,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Array of advance IDs associated with the user',
    type: [String],
  })
  @IsString({ each: true })
  @IsArray()
  @IsOptional()
  advances?: string[];

  @ApiPropertyOptional({
    description: 'The authentication provider (e.g., google)',
  })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiPropertyOptional({ description: 'The provider-specific user ID' })
  @IsString()
  @IsOptional()
  providerId?: string;

  // Additional Registration/Franchise Fields
  @ApiPropertyOptional({ description: 'National ID number' })
  @IsString()
  @IsOptional()
  nationalId?: string;

  @ApiPropertyOptional({ description: 'Date of birth' })
  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Business/Company name' })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional({ description: 'Business type' })
  @IsString()
  @IsOptional()
  businessType?: string;

  @ApiPropertyOptional({ description: 'Trade license/Registration ID' })
  @IsString()
  @IsOptional()
  tradeLicense?: string;

  @ApiPropertyOptional({ description: 'Business address' })
  @IsString()
  @IsOptional()
  businessAddress?: string;

  @ApiPropertyOptional({ description: 'Number of employees' })
  @IsString()
  @IsOptional()
  numEmployees?: string;

  @ApiPropertyOptional({ description: 'Years in operation' })
  @IsString()
  @IsOptional()
  yearsInOperation?: string;

  @ApiPropertyOptional({ description: 'Preferred franchise location' })
  @IsString()
  @IsOptional()
  preferredLocation?: string;

  @ApiPropertyOptional({ description: 'Desired start date' })
  @IsString()
  @IsOptional()
  desiredStartDate?: string;

  @ApiPropertyOptional({ description: 'Manage Seer to Bradgyn' })
  @IsString()
  @IsOptional()
  manageSeerToBradgyn?: string;

  @ApiPropertyOptional({
    description: 'Service package: basic, standard, premium',
  })
  @IsString()
  @IsOptional()
  servicePackage?: string;

  @ApiPropertyOptional({ description: 'Reason for choosing franchise' })
  @IsString()
  @IsOptional()
  reasonForFranchise?: string;

  @ApiPropertyOptional({ description: 'Previous franchise experience: yes/no' })
  @IsString()
  @IsOptional()
  previousExperience?: string;

  @ApiPropertyOptional({ description: 'Experience details' })
  @IsString()
  @IsOptional()
  experienceDetails?: string;

  @ApiPropertyOptional({ description: 'Preferred payment method' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Bank name' })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Bank account number' })
  @IsString()
  @IsOptional()
  bankAccount?: string;

  @ApiPropertyOptional({ description: 'Initial investment capability' })
  @IsString()
  @IsOptional()
  initialInvestment?: string;

  @ApiPropertyOptional({ description: 'Expected monthly revenue' })
  @IsString()
  @IsOptional()
  expectedRevenue?: string;

  @ApiPropertyOptional({ description: 'Number of staff' })
  @IsString()
  @IsOptional()
  numStaff?: string;

  @ApiPropertyOptional({ description: 'Staff names (optional)' })
  @IsString()
  @IsOptional()
  staffNames?: string;

  @ApiPropertyOptional({ description: 'Relation' })
  @IsString()
  @IsOptional()
  relation?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Social media links' })
  @IsString()
  @IsOptional()
  socialMedia?: string;

  @ApiPropertyOptional({ description: 'Terms and conditions accepted' })
  @IsOptional()
  termsAccepted?: boolean;

  @ApiPropertyOptional({ description: 'Franchise policy agreement accepted' })
  @IsOptional()
  policyAccepted?: boolean;

  @ApiPropertyOptional({ description: 'NDA agreement accepted' })
  @IsOptional()
  ndaAccepted?: boolean;

  @ApiPropertyOptional({ description: 'Uploaded documents', type: 'array' })
  @IsOptional()
  documents?: any[];
}
