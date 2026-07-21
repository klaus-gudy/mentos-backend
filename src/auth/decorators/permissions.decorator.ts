import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Requires the caller's role to carry every listed `<resource>.<action>` key.
 *
 * @example
 *   @Permissions('user.create')
 *   @Post()
 *   invite(...) {}
 */
export const Permissions = (...perms: string[]) => SetMetadata(PERMISSIONS_KEY, perms);
