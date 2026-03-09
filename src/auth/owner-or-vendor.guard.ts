import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/** Only users with role "owner" or "vendor" can create promotions. */
@Injectable()
export class OwnerOrVendorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not found.');
    }
    const role = (user.role || '').toLowerCase();
    if (role === 'owner' || role === 'vendor') {
      return true;
    }
    throw new ForbiddenException('Only users with role "owner" or "vendor" can create promotions.');
  }
}
