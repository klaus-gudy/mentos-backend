import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserTokenPurpose } from '../auth/entities/user-token.entity';
import { TokenService } from '../auth/token.service';
import { MailService } from '../mail/mail.service';
import { RolesService } from '../roles/roles.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User, UserStatus } from './entities/user.entity';

export interface InviteResult {
  user: UserResponseDto;
  /** Surfaced only in development so the flow is testable from Swagger. */
  devToken?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly roles: RolesService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  private get isDev(): boolean {
    return this.config.get<string>('nodeEnv') !== 'production';
  }

  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  // ---- lookups -----------------------------------------------------------

  /** Used by JwtStrategy on every authenticated request. */
  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email: UsersService.normalizeEmail(email) } });
  }

  /** Includes the password hash, which the entity omits from normal selects. */
  findByEmailWithSecret(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: UsersService.normalizeEmail(email) })
      .getOne();
  }

  async findByCodeOrFail(code: string): Promise<User> {
    const user = await this.users.findOne({ where: { code } });
    if (!user) {
      throw new NotFoundException(`User "${code}" not found`);
    }
    return user;
  }

  async count(): Promise<number> {
    return this.users.count();
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.users.find({ order: { createdAt: 'ASC' } });
    return UserResponseDto.fromMany(users);
  }

  async findOne(code: string): Promise<UserResponseDto> {
    return UserResponseDto.from(await this.findByCodeOrFail(code));
  }

  // ---- creation ----------------------------------------------------------

  /**
   * Allocates the next `US-n` code and inserts the user in one transaction, so
   * two concurrent invites cannot claim the same code. The unique index on
   * `code` is the backstop.
   */
  async createUser(data: {
    fullName: string;
    email: string;
    roleId: string;
    status: UserStatus;
    passwordHash?: string | null;
    mfaEnabled?: boolean;
  }): Promise<User> {
    const email = UsersService.normalizeEmail(data.email);

    if (await this.users.exists({ where: { email } })) {
      throw new ConflictException(`${email} is already registered`);
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(User);
      await manager.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');

      const row = await repo
        .createQueryBuilder('user')
        .select('COALESCE(MAX(CAST(SUBSTRING(user.code FROM 4) AS INTEGER)), 0)', 'max')
        .getRawOne<{ max: string }>();

      const user = repo.create({
        code: `US-${parseInt(row?.max ?? '0', 10) + 1}`,
        fullName: data.fullName.trim(),
        email,
        roleId: data.roleId,
        status: data.status,
        passwordHash: data.passwordHash ?? null,
        mfaEnabled: data.mfaEnabled ?? false,
        lastLoginAt: null,
        tokenVersion: 0,
      });

      return repo.save(user);
    });
  }

  /**
   * Admin invite: creates a passwordless `invited` user and emails a single-use
   * activation token. The account cannot sign in until POST /auth/accept-invite
   * redeems that token.
   */
  async invite(dto: CreateUserDto): Promise<InviteResult> {
    const role = await this.roles.findByCodeOrFail(dto.roleId);

    const created = await this.createUser({
      fullName: dto.name,
      email: dto.email,
      roleId: role.id,
      status: UserStatus.Invited,
      passwordHash: null,
      mfaEnabled: dto.mfa ?? false,
    });

    const { token } = await this.tokens.issueUserToken(created.id, UserTokenPurpose.Invite);
    await this.mail.sendInvite({
      to: created.email,
      fullName: created.fullName,
      roleName: role.name,
      token,
    });

    const user = await this.findByCodeOrFail(created.code);
    return { user: UserResponseDto.from(user), ...(this.isDev ? { devToken: token } : {}) };
  }

  /** Re-issues the activation token, retiring the previous one. */
  async resendInvite(code: string): Promise<InviteResult> {
    const user = await this.findByCodeOrFail(code);

    if (user.status !== UserStatus.Invited) {
      throw new BadRequestException(`${user.fullName} has already accepted their invite`);
    }

    const { token } = await this.tokens.issueUserToken(user.id, UserTokenPurpose.Invite);
    await this.mail.sendInvite({
      to: user.email,
      fullName: user.fullName,
      roleName: user.role.name,
      token,
    });

    return { user: UserResponseDto.from(user), ...(this.isDev ? { devToken: token } : {}) };
  }

  // ---- mutation ----------------------------------------------------------

  async update(code: string, dto: UpdateUserDto, actingUserId: string): Promise<UserResponseDto> {
    const user = await this.findByCodeOrFail(code);

    if (dto.name !== undefined) {
      user.fullName = dto.name.trim();
    }

    if (dto.roleId !== undefined) {
      const role = await this.roles.findByCodeOrFail(dto.roleId);
      if (user.id === actingUserId && role.id !== user.roleId) {
        throw new BadRequestException('You cannot change your own role');
      }
      user.roleId = role.id;
      user.role = role;
    }

    if (dto.mfa !== undefined) {
      user.mfaEnabled = dto.mfa;
    }

    if (dto.status !== undefined && dto.status !== user.status) {
      await this.applyStatus(user, dto.status, actingUserId);
    }

    await this.users.save(user);
    return this.findOne(user.code);
  }

  /** The frontend's `toggleUserStatus` — flips active ⇄ suspended. */
  async toggleStatus(code: string, actingUserId: string): Promise<UserResponseDto> {
    const user = await this.findByCodeOrFail(code);

    if (user.status === UserStatus.Invited) {
      throw new BadRequestException(
        `${user.fullName} has not accepted their invite yet — resend it instead`,
      );
    }

    const next = user.status === UserStatus.Active ? UserStatus.Suspended : UserStatus.Active;
    await this.applyStatus(user, next, actingUserId);
    await this.users.save(user);
    return this.findOne(user.code);
  }

  /**
   * Suspension must take effect immediately, so it revokes refresh tokens and
   * bumps `tokenVersion` to kill any access token already in flight.
   */
  private async applyStatus(user: User, next: UserStatus, actingUserId: string): Promise<void> {
    if (user.id === actingUserId && next !== UserStatus.Active) {
      throw new BadRequestException('You cannot suspend your own account');
    }

    if (next === UserStatus.Suspended) {
      user.tokenVersion += 1;
      await this.tokens.revokeAllForUser(user.id);
    }

    if (next === UserStatus.Active && user.status === UserStatus.Invited) {
      throw new BadRequestException('The user must accept their invite before being activated');
    }

    user.status = next;
  }

  async recordLogin(user: User): Promise<void> {
    await this.users.update(user.id, { lastLoginAt: new Date() });
  }

  async setPassword(userId: string, passwordHash: string, activate: boolean): Promise<void> {
    const patch: Partial<User> = { passwordHash };
    if (activate) {
      patch.status = UserStatus.Active;
    }
    await this.users.update(userId, patch);
  }

  /** Invalidates every access token already issued for this user. */
  async bumpTokenVersion(userId: string): Promise<void> {
    await this.users.increment({ id: userId }, 'tokenVersion', 1);
  }
}
