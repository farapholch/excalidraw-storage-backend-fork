import {
  Body,
  Controller,
  Get,
  Header,
  Logger,
  NotFoundException,
  Param,
  Put,
  Patch,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { StorageNamespace, StorageService } from '../storage/storage.service';
import { Readable } from 'stream';

@Controller('files')
export class FilesController {
  private readonly logger = new Logger(FilesController.name);
  namespace = StorageNamespace.FILES;

  constructor(private storageService: StorageService) {}

  @Get(':id')
  @Header('content-type', 'application/octet-stream')
  async findOne(@Param() params, @Res() res: Response): Promise<void> {
    const data = await this.storageService.get(params.id, this.namespace);
    this.logger.debug(`Get image ${params.id}`);

    if (!data) {
      throw new NotFoundException();
    }

    const stream = new Readable();
    stream.push(data);
    stream.push(null);
    stream.pipe(res);
  }

  @Put(':id')
  async create(@Param() params, @Body() payload: Buffer) {
    const id = params.id;
    await this.storageService.set(id, payload, this.namespace);
    this.logger.debug(`Created image ${id}`);

    return {
      id,
    };
  }

  /**
   * PATCH /files/:id/timestamp
   * Förnyar TTL/expire för filen utan att ersätta innehållet.
   */
  @Patch(':id/timestamp')
  async touch(@Param() params) {
    const id = params.id;

    // Kontrollera att filen finns
    const data = await this.storageService.get(id, this.namespace);
    if (!data) {
      throw new NotFoundException();
    }

    // "Touch" – skriv om samma data för att förnya expire
    await this.storageService.set(id, data, this.namespace);

    this.logger.debug(`Touched file ${id}`);
    return {
      id,
      updatedAt: new Date().toISOString(),
    };
  }
}
