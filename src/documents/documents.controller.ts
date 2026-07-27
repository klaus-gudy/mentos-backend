import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

/** Matches the frontend upload dialog's own stated constraint: "PDF, JPG or PNG up to 10 MB". */
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { User } from '../users/entities/user.entity';
import { DocumentOwnerType, DocumentResponseDto, UploadDocumentDto } from './dto/document.dto';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post()
  @Permissions('document.create')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(new BadRequestException('Only PDF, JPG or PNG files are accepted'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'The file plus its metadata, as multipart/form-data',
    schema: {
      type: 'object',
      required: ['file', 'name', 'category', 'ownerType', 'ownerId'],
      properties: {
        file: { type: 'string', format: 'binary' },
        name: { type: 'string', example: 'NIDA copy · Amina Hassan' },
        category: { type: 'string', example: 'Identification' },
        ownerType: { type: 'string', enum: Object.values(DocumentOwnerType) },
        ownerId: { type: 'string', example: 'T-01' },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload a document',
    description: 'Attaches a real file to exactly one owner: a property, unit, tenant, lease, invoice, payment, or maintenance request.',
  })
  @ApiResponse({ status: 201, type: DocumentResponseDto })
  upload(
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ): Promise<DocumentResponseDto> {
    return this.documents.upload(dto, file, user.id);
  }

  @Get()
  @Permissions('document.read')
  @ApiOperation({
    summary: 'List documents',
    description: 'Optionally filter to one owner by passing both ownerType and ownerId.',
  })
  @ApiQuery({ name: 'ownerType', enum: DocumentOwnerType, required: false })
  @ApiQuery({ name: 'ownerId', required: false, example: 'T-01' })
  @ApiResponse({ status: 200, type: [DocumentResponseDto] })
  findAll(
    @Query('ownerType') ownerType?: DocumentOwnerType,
    @Query('ownerId') ownerId?: string,
  ): Promise<DocumentResponseDto[]> {
    return this.documents.findAll({ ownerType, ownerId });
  }

  @Get(':code')
  @Permissions('document.read')
  @ApiOperation({ summary: 'Get one document’s metadata' })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  findOne(@Param('code') code: string): Promise<DocumentResponseDto> {
    return this.documents.findOne(code);
  }

  @Get(':code/download')
  @Permissions('document.read')
  @ApiOperation({ summary: 'Download the file', description: 'Streams the real bytes from object storage.' })
  async download(@Param('code') code: string, @Res() res: Response): Promise<void> {
    const { document, file } = await this.documents.download(code);
    res.setHeader('Content-Type', file.contentType ?? document.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${document.originalFileName ?? document.name}"`,
    );
    if (file.contentLength) {
      res.setHeader('Content-Length', file.contentLength.toString());
    }
    file.stream.pipe(res);
  }

  @Delete(':code')
  @Permissions('document.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document', description: 'Removes both the record and the stored file.' })
  remove(@Param('code') code: string): Promise<void> {
    return this.documents.remove(code);
  }
}
