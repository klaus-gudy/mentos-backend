import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface InviteMail {
  to: string;
  fullName: string;
  roleName: string;
  token: string;
}

export interface PasswordResetMail {
  to: string;
  fullName: string;
  token: string;
}

/**
 * Delivery stub. Every message is logged with its action link instead of being
 * sent, which keeps invite and reset flows fully testable from Swagger with no
 * SMTP credentials.
 *
 * Swapping in a real transport means reimplementing these two methods — nothing
 * outside this class knows how mail is delivered.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  private get appUrl(): string {
    return this.config.get<string>('appUrl') ?? 'http://localhost:4317';
  }

  async sendInvite({ to, fullName, roleName, token }: InviteMail): Promise<void> {
    const link = `${this.appUrl}/accept-invite?token=${token}`;
    this.logger.log(
      `[invite] to=${to} name="${fullName}" role="${roleName}"\n  Accept invite: ${link}`,
    );
    return Promise.resolve();
  }

  async sendPasswordReset({ to, fullName, token }: PasswordResetMail): Promise<void> {
    const link = `${this.appUrl}/reset-password?token=${token}`;
    this.logger.log(`[password-reset] to=${to} name="${fullName}"\n  Reset password: ${link}`);
    return Promise.resolve();
  }

  async sendPasswordChanged(to: string): Promise<void> {
    this.logger.log(`[password-changed] to=${to} — password was changed; all sessions revoked.`);
    return Promise.resolve();
  }
}
