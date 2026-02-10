import { IsString, IsArray } from 'class-validator';

export class AddMemberDto {
  @IsString()
  groupId: string;

  @IsString()
  userId: string;

  @IsString()
  role: string; // 'admin' or 'member'
}
