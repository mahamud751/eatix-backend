import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SocialAuthController } from './social-auth.controller';
import { SocialAuthService } from './social-auth.service';
import { SocialAccountsModule } from '../social-accounts/social-accounts.module';

@Module({
  imports: [ConfigModule, SocialAccountsModule],
  controllers: [SocialAuthController],
  providers: [SocialAuthService],
})
export class SocialAuthModule {}

