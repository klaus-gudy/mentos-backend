import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { NOTIFICATION_TRIGGER_KEYS, triggerByKey } from '../../common/notification-triggers';
import { NotificationTemplate, TemplateLanguage } from '../entities/notification-template.entity';

/** Frontend-facing template shape — mirrors mentos-frontend's `Template` exactly. */
export class TemplateResponseDto {
  @ApiProperty({ example: 'TPL-01', description: 'Business code, used as id by frontend' })
  id: string;

  @ApiProperty({ example: 'Rent due reminder' })
  name: string;

  @ApiProperty({ example: '3 days before rent is due', description: "The trigger's display label in this template's own language" })
  trigger: string;

  @ApiProperty({ example: 'Rent due soon — {{unit}}' })
  subject: string;

  @ApiProperty({ example: 'Hi {{tenant_name}}, this is a reminder that rent of {{amount}} for {{unit}} is due on {{due_date}}.' })
  body: string;

  @ApiProperty({ enum: TemplateLanguage, example: TemplateLanguage.English })
  language: TemplateLanguage;

  static from(template: NotificationTemplate): TemplateResponseDto {
    const trig = triggerByKey(template.triggerKey);
    return {
      id: template.code,
      name: template.name,
      trigger: template.language === TemplateLanguage.Swahili ? trig.sw : trig.en,
      subject: template.subject,
      body: template.body,
      language: template.language,
    };
  }

  static fromMany(templates: NotificationTemplate[]): TemplateResponseDto[] {
    return templates.map((t) => TemplateResponseDto.from(t));
  }
}

/**
 * Mirrors mentos-frontend's `NewTemplateInput`. Creating a template always
 * produces an English + Swahili pair tied to one trigger — the response is
 * the English row (see NotificationsController.createTemplate).
 */
export class CreateTemplateDto {
  @ApiProperty({ example: 'Rent due reminder' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nameEn: string;

  @ApiPropertyOptional({ example: 'Ukumbusho wa kodi', description: 'Defaults to the English name' })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  nameSw?: string;

  @ApiProperty({ enum: NOTIFICATION_TRIGGER_KEYS, example: 'rent-due' })
  @IsString()
  @IsIn(NOTIFICATION_TRIGGER_KEYS)
  triggerKey: string;

  @ApiProperty({ example: 'Rent due soon — {{unit}}' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subjectEn: string;

  @ApiProperty({ example: 'Hi {{tenant_name}}, rent of {{amount}} for {{unit}} is due on {{due_date}}.' })
  @IsString()
  @IsNotEmpty()
  bodyEn: string;

  @ApiProperty({ example: 'Kodi inakaribia kuiva — {{unit}}' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subjectSw: string;

  @ApiProperty({ example: 'Habari {{tenant_name}}, kodi ya {{amount}} kwa {{unit}} inatakiwa kulipwa tarehe {{due_date}}.' })
  @IsString()
  @IsNotEmpty()
  bodySw: string;
}

/** Mirrors what mentos-frontend's edit-template dialog sends: subject + body only. */
export class UpdateTemplateDto {
  @ApiProperty({ example: 'Rent due soon — {{unit}}' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @ApiProperty({ example: 'Hi {{tenant_name}}, rent of {{amount}} for {{unit}} is due on {{due_date}}.' })
  @IsString()
  @IsNotEmpty()
  body: string;
}
