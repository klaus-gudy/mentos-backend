import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User, UserStatus } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';

export interface AccessTokenPayload {
  /** User UUID. */
  sub: string;
  email: string;
  /** Invalidation counter — must match the user's current tokenVersion. */
  tv: number;
}

/**
 * Validates the access token and resolves it to a live User (role eagerly
 * loaded, so PermissionsGuard can read `user.role.perms` without another query).
 *
 * The user is re-read on every request rather than trusted from the token, so
 * suspension and role changes take effect immediately.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret') ?? 'change-me-access',
    });
  }

  async validate(payload: AccessTokenPayload): Promise<User> {
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Account no longer exists');
    }
    if (user.tokenVersion !== payload.tv) {
      throw new UnauthorizedException('Session expired, please sign in again');
    }
    if (user.status === UserStatus.Suspended) {
      throw new UnauthorizedException('Account suspended');
    }
    if (user.status === UserStatus.Invited) {
      throw new UnauthorizedException('Invite not yet accepted');
    }
    return user;
  }
}
