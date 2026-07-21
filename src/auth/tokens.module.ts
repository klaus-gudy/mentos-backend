import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserToken } from './entities/user-token.entity';
import { TokenService } from './token.service';

/**
 * Deliberately dependency-free (beyond its own repositories) so that both
 * UsersModule and AuthModule can import it without forming a cycle.
 */
@Module({
  imports: [TypeOrmModule.forFeature([RefreshToken, UserToken])],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokensModule {}
