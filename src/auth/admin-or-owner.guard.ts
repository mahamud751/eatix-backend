import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class AdminOrOwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not found.');
    }
    if (['superAdmin', 'admin', 'owner'].includes(user.role)) {
      return true;
    }
    throw new ForbiddenException('Access denied. Admin or Owner only.');
  }
}
