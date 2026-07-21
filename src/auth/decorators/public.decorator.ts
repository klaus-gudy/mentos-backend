import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opts a route out of the globally-applied JwtAuthGuard. Authentication is
 * on by default; anonymous access is the exception and must be declared.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
