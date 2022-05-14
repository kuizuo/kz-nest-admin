import { Module } from '@nestjs/common';
import { EmailController } from './email/email.controller';
import { EmailService } from '@/shared/services/email.service';

@Module({
  imports: [],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class ToolsModule {}
