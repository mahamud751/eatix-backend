import { IsString } from 'class-validator';

export class SendGroupMessageDto {
  @IsString()
  groupId: string;

  @IsString()
  senderId: string;

  @IsString()
  content: string;

  @IsString()
  type: string; // 'text', 'image', 'file'

  voiceUrl?: string;

  duration?: number;
}
