import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { UserResponseDto } from '../../users/dto/user-response.dto';

/** Shared password rule so every entry point (register, reset, change) agrees. */
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;
const PASSWORD_MESSAGE =
  'Password must be at least 10 characters and include an uppercase letter, a lowercase letter and a digit';

export class PasswordField {
  @ApiProperty({ example: 'Nyumba#2026', minLength: 10 })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'samira@nyumba.co.tz' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Nyumba#2026' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

/** Bootstrap registration — accepted only while the system has no users. */
export class RegisterDto extends PasswordField {
  @ApiProperty({ example: 'Samira Mketo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  fullName: string;

  @ApiProperty({ example: 'samira@nyumba.co.tz' })
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class RefreshDto {
  @ApiProperty({ description: 'The refreshToken returned by login' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'samira@nyumba.co.tz' })
  @IsEmail()
  email: string;
}

/** Used by both password reset and invite acceptance — same single-use token. */
export class ResetPasswordDto extends PasswordField {
  @ApiProperty({ description: 'Token from the emailed link' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ChangePasswordDto extends PasswordField {
  @ApiProperty({ example: 'Nyumba#2026', description: 'Your existing password' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;
}

export class AuthTokensDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ example: 900, description: 'Access token lifetime in seconds' })
  expiresIn: number;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;
}

export class AuthSessionDto extends AuthTokensDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({
    type: [String],
    example: ['dashboard.read', 'property.read'],
    description: "The signed-in user's effective permission keys",
  })
  perms: string[];
}

export class MessageDto {
  @ApiProperty({ example: 'If that email is registered, a reset link has been sent.' })
  message: string;

  @ApiPropertyOptional({
    description:
      'Development only — the token that would have been emailed, so the flow is testable from Swagger',
  })
  devToken?: string;
}
