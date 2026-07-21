import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User, UserStatus } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RolesService } from '../roles/roles.service';
import { SUPER_ADMIN_CODE } from '../roles/built-in-roles';
import {
  AuthSessionDto,
  AuthTokensDto,
  ChangePasswordDto,
  LoginDto,
  MessageDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { UserTokenPurpose } from './entities/user-token.entity';
import { AccessTokenPayload } from './strategies/jwt.strategy';
import { RefreshContext, TokenService } from './token.service';
import { parseTtlSeconds } from './ttl.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly roles: RolesService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private get isDev(): boolean {
    return this.config.get<string>('nodeEnv') !== 'production';
  }

  private get bcryptRounds(): number {
    return this.config.get<number>('auth.bcryptRounds') ?? 12;
  }

  // ---- registration ------------------------------------------------------

  /**
   * Bootstrap registration. Open only while the system has zero users — it
   * exists to create the first Super Admin on a fresh database. Once anyone
   * exists, accounts come from admin invites (POST /api/users).
   */
  async register(dto: RegisterDto, ctx: RefreshContext): Promise<AuthSessionDto> {
    if ((await this.users.count()) > 0) {
      throw new ConflictException(
        'Registration is closed — this system already has users. Ask an administrator for an invite.',
      );
    }

    // A database that was never seeded has no roles at all, so install the
    // built-in set before assigning one.
    await this.roles.ensureBuiltInRoles();
    const role = await this.roles.findByCodeOrFail(SUPER_ADMIN_CODE);

    const created = await this.users.createUser({
      fullName: dto.fullName,
      email: dto.email,
      roleId: role.id,
      status: UserStatus.Active,
      passwordHash: await bcrypt.hash(dto.password, this.bcryptRounds),
    });

    this.logger.log(`Bootstrap account created: ${created.email} (${role.name})`);

    const user = await this.users.findByCodeOrFail(created.code);
    return this.issueSession(user, ctx);
  }

  // ---- sign in / out -----------------------------------------------------

  async login(dto: LoginDto, ctx: RefreshContext): Promise<AuthSessionDto> {
    const user = await this.users.findByEmailWithSecret(dto.email);

    // One generic message and a hash comparison even when the user is missing,
    // so neither the response nor the response time reveals which emails exist.
    const hash =
      user?.passwordHash ?? '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvaliduu';
    const ok = await bcrypt.compare(dto.password, hash);

    if (!user || !ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === UserStatus.Suspended) {
      throw new UnauthorizedException('This account has been suspended');
    }

    // Backstop only. An invited account has no password hash, so it fails the
    // comparison above and gets the generic message — which is what we want:
    // saying "accept your invite first" would confirm the address is registered.
    if (user.status === UserStatus.Invited) {
      throw new UnauthorizedException('Please accept your invite before signing in');
    }

    await this.users.recordLogin(user);
    return this.issueSession(user, ctx);
  }

  async refresh(refreshToken: string, ctx: RefreshContext): Promise<AuthTokensDto> {
    const { userId, issued } = await this.tokens.rotateRefreshToken(refreshToken, ctx);

    const user = await this.users.findById(userId);
    if (!user || user.status !== UserStatus.Active) {
      await this.tokens.revokeAllForUser(userId);
      throw new UnauthorizedException('Account is no longer active');
    }

    return {
      accessToken: await this.signAccessToken(user),
      refreshToken: issued.token,
      expiresIn: this.accessTtlSeconds(),
      tokenType: 'Bearer',
    };
  }

  async logout(refreshToken: string): Promise<MessageDto> {
    await this.tokens.revokeRefreshToken(refreshToken);
    return { message: 'Signed out.' };
  }

  async logoutAll(user: User): Promise<MessageDto> {
    await this.tokens.revokeAllForUser(user.id);
    await this.users.bumpTokenVersion(user.id);
    return { message: 'Signed out of all devices.' };
  }

  // ---- password lifecycle ------------------------------------------------

  /**
   * Always reports success. Confirming whether an address is registered would
   * turn this endpoint into an account-enumeration oracle.
   */
  async forgotPassword(email: string): Promise<MessageDto> {
    const user = await this.users.findByEmail(email);
    const message = 'If that email is registered, a reset link has been sent.';

    if (!user || user.status === UserStatus.Suspended) {
      return { message };
    }

    const { token } = await this.tokens.issueUserToken(user.id, UserTokenPurpose.PasswordReset);
    await this.mail.sendPasswordReset({
      to: user.email,
      fullName: user.fullName,
      token,
    });

    return { message, ...(this.isDev ? { devToken: token } : {}) };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<MessageDto> {
    const record = await this.tokens.redeemUserToken(dto.token, UserTokenPurpose.PasswordReset);

    await this.users.setPassword(
      record.userId,
      await bcrypt.hash(dto.password, this.bcryptRounds),
      false,
    );

    // A reset is the remedy for a compromised account, so every existing
    // session dies with it.
    await this.tokens.revokeAllForUser(record.userId);
    await this.users.bumpTokenVersion(record.userId);

    const user = await this.users.findById(record.userId);
    if (user) {
      await this.mail.sendPasswordChanged(user.email);
    }

    return { message: 'Password updated. You can now sign in.' };
  }

  /** Invite acceptance: same single-use machinery, plus invited → active. */
  async acceptInvite(dto: ResetPasswordDto, ctx: RefreshContext): Promise<AuthSessionDto> {
    const record = await this.tokens.redeemUserToken(dto.token, UserTokenPurpose.Invite);

    await this.users.setPassword(
      record.userId,
      await bcrypt.hash(dto.password, this.bcryptRounds),
      true,
    );

    const user = await this.users.findById(record.userId);
    if (!user) {
      throw new UnauthorizedException('Account no longer exists');
    }

    await this.users.recordLogin(user);
    return this.issueSession(user, ctx);
  }

  async changePassword(user: User, dto: ChangePasswordDto): Promise<MessageDto> {
    const withSecret = await this.users.findByEmailWithSecret(user.email);
    const ok =
      withSecret?.passwordHash != null &&
      (await bcrypt.compare(dto.currentPassword, withSecret.passwordHash));

    if (!ok) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.users.setPassword(
      user.id,
      await bcrypt.hash(dto.password, this.bcryptRounds),
      false,
    );
    await this.tokens.revokeAllForUser(user.id);
    await this.users.bumpTokenVersion(user.id);
    await this.mail.sendPasswordChanged(user.email);

    return { message: 'Password changed. Please sign in again.' };
  }

  // ---- session assembly --------------------------------------------------

  /** The signed-in user plus the permission keys the frontend gates its UI on. */
  profile(user: User): Omit<AuthSessionDto, keyof AuthTokensDto> {
    return { user: UserResponseDto.from(user), perms: user.role?.perms ?? [] };
  }

  private async issueSession(user: User, ctx: RefreshContext): Promise<AuthSessionDto> {
    const { token: refreshToken } = await this.tokens.issueRefreshToken(user.id, ctx);

    return {
      accessToken: await this.signAccessToken(user),
      refreshToken,
      expiresIn: this.accessTtlSeconds(),
      tokenType: 'Bearer',
      user: UserResponseDto.from(user),
      perms: user.role?.perms ?? [],
    };
  }

  private signAccessToken(user: User): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      tv: user.tokenVersion,
    };
    return this.jwt.signAsync(payload);
  }

  private accessTtlSeconds(): number {
    return parseTtlSeconds(this.config.get<string>('jwt.accessTtl'));
  }
}
