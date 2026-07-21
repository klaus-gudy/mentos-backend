import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { IsNull, LessThan, Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserToken, UserTokenPurpose } from './entities/user-token.entity';

export interface IssuedToken {
  /** The plaintext value — returned to the caller once and never stored. */
  token: string;
  expiresAt: Date;
}

export interface RefreshContext {
  userAgent?: string | null;
  ip?: string | null;
}

/**
 * Issues, stores and redeems the opaque tokens: refresh tokens and the
 * single-use invite / password-reset tokens.
 *
 * Only SHA-256 hashes are persisted. A plaintext token exists in exactly two
 * places — the response we return and the email we send — never in the database.
 * SHA-256 (not bcrypt) is right here because these are 256-bit random values,
 * not low-entropy human passwords, so there is nothing to brute-force.
 *
 * Lives in its own module so both UsersModule (invites) and AuthModule can
 * depend on it without a circular import.
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    @InjectRepository(UserToken)
    private readonly userTokens: Repository<UserToken>,
    private readonly config: ConfigService,
  ) {}

  static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private static generate(): string {
    return randomBytes(32).toString('base64url');
  }

  // ---- invite / password-reset tokens ------------------------------------

  /**
   * Issues a single-use token, invalidating any outstanding token of the same
   * purpose so a fresh "forgot password" request retires the previous link.
   */
  async issueUserToken(userId: string, purpose: UserTokenPurpose): Promise<IssuedToken> {
    await this.userTokens.update({ userId, purpose, usedAt: IsNull() }, { usedAt: new Date() });

    const ttlMinutes =
      purpose === UserTokenPurpose.Invite
        ? (this.config.get<number>('auth.inviteTtlMinutes') ?? 10080)
        : (this.config.get<number>('auth.resetTtlMinutes') ?? 60);

    const token = TokenService.generate();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

    await this.userTokens.save(
      this.userTokens.create({
        tokenHash: TokenService.hash(token),
        userId,
        purpose,
        expiresAt,
        usedAt: null,
      }),
    );

    return { token, expiresAt };
  }

  /** Consumes a token, or throws if it is unknown, expired or already used. */
  async redeemUserToken(token: string, purpose: UserTokenPurpose): Promise<UserToken> {
    const record = await this.userTokens.findOne({
      where: { tokenHash: TokenService.hash(token), purpose },
    });

    if (!record || !record.isUsable) {
      throw new BadRequestException(
        'This link is invalid or has expired. Please request a new one.',
      );
    }

    record.usedAt = new Date();
    await this.userTokens.save(record);
    return record;
  }

  // ---- refresh tokens ----------------------------------------------------

  async issueRefreshToken(userId: string, ctx: RefreshContext = {}): Promise<IssuedToken> {
    const ttlDays = this.config.get<number>('auth.refreshTtlDays') ?? 7;
    const token = TokenService.generate();
    const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);

    await this.refreshTokens.save(
      this.refreshTokens.create({
        tokenHash: TokenService.hash(token),
        userId,
        expiresAt,
        revokedAt: null,
        replacedByTokenHash: null,
        userAgent: ctx.userAgent?.slice(0, 255) ?? null,
        ip: ctx.ip?.slice(0, 64) ?? null,
      }),
    );

    return { token, expiresAt };
  }

  /**
   * Rotates a refresh token: the presented one is revoked and a successor
   * issued.
   *
   * Presenting an *already revoked* token means the same token was redeemed
   * twice — either a stolen copy or a replay. We cannot tell which party is
   * legitimate, so every session for that user is revoked and both must sign
   * in again.
   */
  async rotateRefreshToken(
    token: string,
    ctx: RefreshContext = {},
  ): Promise<{ userId: string; issued: IssuedToken }> {
    const record = await this.refreshTokens.findOne({
      where: { tokenHash: TokenService.hash(token) },
    });

    if (!record) {
      throw new BadRequestException('Invalid refresh token');
    }

    if (record.revokedAt !== null) {
      this.logger.warn(
        `Refresh token reuse detected for user ${record.userId} — revoking all sessions.`,
      );
      await this.revokeAllForUser(record.userId);
      throw new BadRequestException('Refresh token already used — all sessions have been revoked');
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Refresh token expired');
    }

    const issued = await this.issueRefreshToken(record.userId, ctx);
    record.revokedAt = new Date();
    record.replacedByTokenHash = TokenService.hash(issued.token);
    await this.refreshTokens.save(record);

    return { userId: record.userId, issued };
  }

  /** Signs out one session. Unknown or already-revoked tokens are a no-op. */
  async revokeRefreshToken(token: string): Promise<void> {
    await this.refreshTokens.update(
      { tokenHash: TokenService.hash(token), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  /** Signs out every session — used on password change, reset and suspension. */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshTokens.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  /** Housekeeping for expired rows; safe to call from a scheduled job later. */
  async purgeExpired(): Promise<void> {
    const now = new Date();
    await this.refreshTokens.delete({ expiresAt: LessThan(now) });
    await this.userTokens.delete({ expiresAt: LessThan(now) });
  }
}
