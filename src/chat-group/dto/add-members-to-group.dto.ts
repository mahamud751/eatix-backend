import { IsString, IsArray, ArrayMinSize, IsOptional } from 'class-validator';

export class AddMembersToGroupDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userIds: string[];

  @IsString()
  @IsOptional()
  role?: string;
}
