import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { User, UserStatus } from '../../users/entities/user.entity';
import type { Seeder } from './seed';

/**
 * Shared password for every seeded account, so the demo is usable immediately.
 * Development data only — the seeder refuses to run in production.
 */
const SEED_PASSWORD = 'Nyumba#2026';

interface SeedUser {
  code: string;
  fullName: string;
  email: string;
  roleCode: string;
  status: UserStatus;
  mfaEnabled: boolean;
  /** Hours since the last sign-in, or null for accounts that never signed in. */
  lastLoginHoursAgo: number | null;
}

/** Ported from mentos-frontend/lib/seed.ts; display strings become real dates. */
const USERS: SeedUser[] = [
  {
    code: 'US-1',
    fullName: 'Samira Mketo',
    email: 'samira@nyumba.co.tz',
    roleCode: 'role-super',
    status: UserStatus.Active,
    mfaEnabled: true,
    lastLoginHoursAgo: 0,
  },
  {
    code: 'US-2',
    fullName: 'Khalid Juma',
    email: 'khalid@nyumba.co.tz',
    roleCode: 'role-pm',
    status: UserStatus.Active,
    mfaEnabled: true,
    lastLoginHoursAgo: 3,
  },
  {
    code: 'US-3',
    fullName: 'Asha Ndizi',
    email: 'asha@nyumba.co.tz',
    roleCode: 'role-acct',
    status: UserStatus.Active,
    mfaEnabled: true,
    lastLoginHoursAgo: 26,
  },
  {
    code: 'US-4',
    fullName: 'Hamisi Kibo',
    email: 'hamisi@nyumba.co.tz',
    roleCode: 'role-maint',
    status: UserStatus.Active,
    mfaEnabled: false,
    lastLoginHoursAgo: 5,
  },
  {
    code: 'US-5',
    fullName: 'Rehema Paul',
    email: 'rehema@nyumba.co.tz',
    roleCode: 'role-pm',
    status: UserStatus.Invited,
    mfaEnabled: false,
    lastLoginHoursAgo: null,
  },
  {
    code: 'US-6',
    fullName: 'Joseph Lyimo',
    email: 'joseph@nyumba.co.tz',
    roleCode: 'role-acct',
    status: UserStatus.Suspended,
    mfaEnabled: true,
    lastLoginHoursAgo: 12 * 24,
  },
];

export const usersSeeder: Seeder = {
  name: 'users',
  async run(ds: DataSource): Promise<void> {
    const logger = new Logger('Seed:users');

    if (process.env.NODE_ENV === 'production') {
      logger.warn('Skipped — seeded accounts share a known password and are development-only.');
      return;
    }

    const users = ds.getRepository(User);
    const roles = ds.getRepository(Role);
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

    for (const data of USERS) {
      const role = await roles.findOne({ where: { code: data.roleCode } });
      if (!role) {
        throw new Error(`Role "${data.roleCode}" missing — the roles seeder must run first.`);
      }

      const existing = await users.findOne({ where: { code: data.code } });
      if (existing) {
        continue; // never clobber a password an operator has since changed
      }

      await users.save(
        users.create({
          code: data.code,
          fullName: data.fullName,
          email: data.email,
          // Invited users have no password until they redeem their invite.
          passwordHash: data.status === UserStatus.Invited ? null : passwordHash,
          roleId: role.id,
          status: data.status,
          mfaEnabled: data.mfaEnabled,
          lastLoginAt:
            data.lastLoginHoursAgo === null
              ? null
              : new Date(Date.now() - data.lastLoginHoursAgo * 3_600_000),
          tokenVersion: 0,
        }),
      );
      logger.log(`created ${data.code} ${data.email} (${role.name})`);
    }

    logger.log(`Sign in with any active account above — password: ${SEED_PASSWORD}`);
  },
};
