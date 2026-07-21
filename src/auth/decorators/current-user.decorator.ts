import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { User } from '../../users/entities/user.entity';

/**
 * Injects the authenticated User that JwtStrategy loaded and attached to the
 * request. Only valid on routes covered by JwtAuthGuard (i.e. not `@Public()`).
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): User => {
  const request = ctx.switchToHttp().getRequest<Request & { user: User }>();
  return request.user;
});
