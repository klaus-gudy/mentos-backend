import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import {
  AuthSessionDto,
  AuthTokensDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  MessageDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { RefreshContext } from './token.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Session metadata recorded against each refresh token, for audit. */
  private static context(req: Request): RefreshContext {
    return {
      userAgent: req.get('user-agent') ?? null,
      ip: req.ip ?? null,
    };
  }

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Bootstrap the first account',
    description:
      'Available only while the system has no users; the account created becomes Super Admin. ' +
      'Afterwards this returns 409 and accounts come from admin invites.',
  })
  @ApiResponse({ status: 201, type: AuthSessionDto })
  @ApiResponse({ status: 409, description: 'Registration closed — users already exist' })
  register(@Body() dto: RegisterDto, @Req() req: Request): Promise<AuthSessionDto> {
    return this.auth.register(dto, AuthController.context(req));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiResponse({ status: 200, type: AuthSessionDto })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials, or account suspended/unactivated',
  })
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthSessionDto> {
    return this.auth.login(dto, AuthController.context(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange a refresh token for a new access token',
    description:
      'Refresh tokens rotate: the presented token is revoked and a new one returned. ' +
      'Re-using a spent token revokes every session for that user.',
  })
  @ApiResponse({ status: 200, type: AuthTokensDto })
  refresh(@Body() dto: RefreshDto, @Req() req: Request): Promise<AuthTokensDto> {
    return this.auth.refresh(dto.refreshToken, AuthController.context(req));
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign out one session',
    description: 'Revokes the given refresh token.',
  })
  logout(@Body() dto: RefreshDto): Promise<MessageDto> {
    return this.auth.logout(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out of every device' })
  logoutAll(@CurrentUser() user: User): Promise<MessageDto> {
    return this.auth.logoutAll(user);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({
    summary: 'The signed-in user and their effective permissions',
    description: 'The frontend gates its navigation and buttons on the returned `perms`.',
  })
  me(@CurrentUser() user: User) {
    return this.auth.profile(user);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a password-reset link',
    description:
      'Always reports success so the endpoint cannot be used to discover which emails are registered. ' +
      'In development the token is returned as `devToken`.',
  })
  @ApiResponse({ status: 200, type: MessageDto })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageDto> {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set a new password using a reset token',
    description: 'The token is single-use; all existing sessions are revoked.',
  })
  @ApiResponse({ status: 200, type: MessageDto })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageDto> {
    return this.auth.resetPassword(dto);
  }

  @Public()
  @Post('accept-invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept an invite by setting the first password',
    description: 'Activates the account and signs the user straight in.',
  })
  @ApiResponse({ status: 200, type: AuthSessionDto })
  acceptInvite(@Body() dto: ResetPasswordDto, @Req() req: Request): Promise<AuthSessionDto> {
    return this.auth.acceptInvite(dto, AuthController.context(req));
  }

  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change your own password',
    description: 'Requires the current password; revokes every session on success.',
  })
  @ApiResponse({ status: 200, type: MessageDto })
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto): Promise<MessageDto> {
    return this.auth.changePassword(user, dto);
  }
}
