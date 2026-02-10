import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not found.');
    }
    if (['superAdmin', 'admin'].includes(user.role)) {
      return true;
    }
    throw new ForbiddenException('Access denied. Admins only.');
  }
}
