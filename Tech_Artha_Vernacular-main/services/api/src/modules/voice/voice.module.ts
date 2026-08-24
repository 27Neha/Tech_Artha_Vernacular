import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VoiceController } from './voice.controller';
import { VoiceIntentService } from './voice.service';

@Module({ imports: [AuthModule], controllers: [VoiceController], providers: [VoiceIntentService] })
export class VoiceModule {}
