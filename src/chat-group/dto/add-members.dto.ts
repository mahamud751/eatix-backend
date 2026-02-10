import { IsString, IsArray, ArrayMinSize, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class MemberInfo {
  @IsString()
  userId: string;

  @IsString()
  role: string; // 'admin' or 'member'
}

export class AddMembersDto {
  @IsString()
  @IsOptional()
  groupId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MemberInfo)
  members: MemberInfo[];
}