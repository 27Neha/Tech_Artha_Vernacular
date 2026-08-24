import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../common/auth';
import { VoiceIntentService } from './voice.service';

@Controller('voice')
@UseGuards(AccessTokenGuard)
export class VoiceController {
  constructor(private readonly voice: VoiceIntentService) {}

  @Get('status')
  status() { return this.voice.status(); }

  @Post('interpret')
  interpret(@Body('text') text: string) { return this.voice.interpret(text ?? ''); }
}
