import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { AIProvider } from './ai.provider';
import { OllamaProvider } from './ollama.provider';

@Module({ 
  imports: [AuthModule, ConsentModule, PrismaModule], 
  controllers: [AssistantController], 
  providers: [
    AssistantService,
    {
      provide: AIProvider,
      useClass: OllamaProvider
    }
  ] 
})
export class AssistantModule {}
