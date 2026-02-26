import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/** Only users with role "owner" can create sponsored videos. */
@Injectable()
export class OwnerOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not found.');
    }
    if (user.role === 'owner') {
      return true;
    }
    throw new ForbiddenException('Only users with role "owner" can create sponsored videos.');
  }
}
