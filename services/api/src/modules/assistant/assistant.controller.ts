import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { AssistantService } from './assistant.service';

@Controller('assistant')
@UseGuards(AccessTokenGuard)
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('messages')
  reply(@CurrentUser() user: AuthenticatedUser, @Body() body: { message?: string; locale?: string }) {
    return this.assistant.respond(user.id, body.message ?? '', body.locale ?? 'en');
  }
}
