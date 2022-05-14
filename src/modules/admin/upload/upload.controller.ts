import fs from 'fs';
import path from 'path';
import { Controller, Post, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { ApiTags } from '@nestjs/swagger';

function genFileName(file: MultipartFile) {
  const name = file.filename.split('.')[0];
  const extName = path.extname(file.filename);
  const randomName = Array(4)
    .fill(null)
    .map(() => Math.round(Math.random() * 16).toString(16))
    .join('');
  const fileName = `${name}-${randomName}${extName}`;
  return fileName;
}
@ApiTags('上传模块')
@Controller('upload')
export class UploadController {
  @Post()
  async uploadFile(@Req() req: FastifyRequest) {
    const file: MultipartFile = await req.file();
    const fileName = genFileName(file);

    try {
      const buffer = await file.toBuffer();
      const filePath = path.join(__dirname, '../../../../', 'public/upload', fileName);
      const writeStream = fs.createWriteStream(filePath);
      writeStream.write(buffer);
    } catch (err) {
      console.log(err);
    }

    return { fileName: `/upload/${fileName}` };
  }
}
