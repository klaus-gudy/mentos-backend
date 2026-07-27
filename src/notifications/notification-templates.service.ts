import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateTemplateDto, TemplateResponseDto, UpdateTemplateDto } from './dto/notification-template.dto';
import { NotificationTemplate, TemplateLanguage } from './entities/notification-template.entity';

@Injectable()
export class NotificationTemplatesService {
  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly templates: Repository<NotificationTemplate>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<TemplateResponseDto[]> {
    const rows = await this.templates.find({ order: { createdAt: 'ASC' } });
    return TemplateResponseDto.fromMany(rows);
  }

  // Always creates an English + Swahili pair tied to one trigger, matching
  // the frontend's "Create in both languages" template dialog. Returns the
  // English row, same as the mock it replaces.
  async create(dto: CreateTemplateDto): Promise<TemplateResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(NotificationTemplate);
      await manager.query('LOCK TABLE notification_templates IN SHARE ROW EXCLUSIVE MODE');

      const row = await repo
        .createQueryBuilder('template')
        .select('COALESCE(MAX(CAST(SUBSTRING(template.code FROM 5) AS INTEGER)), 0)', 'max')
        .where("template.code ~ '^TPL-[0-9]+$'")
        .getRawOne<{ max: string }>();
      const seq = parseInt(row?.max ?? '0', 10) + 1;
      const code = `TPL-${String(seq).padStart(2, '0')}`;

      const en = new NotificationTemplate();
      en.code = code;
      en.pairCode = code;
      en.name = dto.nameEn.trim() || 'Untitled template';
      en.triggerKey = dto.triggerKey;
      en.language = TemplateLanguage.English;
      en.subject = dto.subjectEn;
      en.body = dto.bodyEn;

      const sw = new NotificationTemplate();
      sw.code = `${code}-SW`;
      sw.pairCode = code;
      sw.name = dto.nameSw?.trim() || en.name;
      sw.triggerKey = dto.triggerKey;
      sw.language = TemplateLanguage.Swahili;
      sw.subject = dto.subjectSw;
      sw.body = dto.bodySw;

      await repo.save([en, sw]);
      return TemplateResponseDto.from(en);
    });
  }

  async update(code: string, dto: UpdateTemplateDto): Promise<TemplateResponseDto> {
    const template = await this.templates.findOne({ where: { code } });
    if (!template) throw new NotFoundException(`Template "${code}" not found`);
    template.subject = dto.subject;
    template.body = dto.body;
    const saved = await this.templates.save(template);
    return TemplateResponseDto.from(saved);
  }
}
