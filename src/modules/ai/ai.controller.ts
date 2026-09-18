import { Body, Controller, HttpCode, HttpStatus, Logger, Post, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AiService } from './ai.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { chatSchema } from './validation/chat.validation';
import { JoiValidationPipe } from '../../common/pipes';
import { Public } from '../../common/decorators';
import { ResponseMessage } from '../../common/interceptors';
import { MESSAGES } from '../../common/constants';

/**
 * AI assistant endpoints.
 *
 * Both routes are `@Public()` so any store visitor can use the assistant.
 * A JWT is still auto-sent by the frontend when the user is logged in, but the
 * backend treats the session as anonymous (keyed by `sessionId`).
 *
 * Note on streaming: the `/chat/stream` route takes over the raw response
 * (`@Res()`) and writes Server-Sent Events. The global ResponseEnvelopeInterceptor
 * does not re-send the response because the handler manages it directly.
 */
@ApiTags('AI')
@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly ai: AiService) {}

  @Public()
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask the marketplace AI assistant (non-streaming)' })
  @ApiBody({ type: ChatMessageDto })
  @ApiResponse({ status: 200, description: 'Assistant reply', type: ChatMessageDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 503, description: 'AI assistant unavailable' })
  @ResponseMessage(MESSAGES.AI.REPLY)
  async chat(@Body(new JoiValidationPipe(chatSchema)) dto: ChatMessageDto) {
    const { reply, sessionId } = await this.ai.chat(dto);
    return { reply, sessionId };
  }

  @Public()
  @Post('chat/stream')
  @ApiOperation({
    summary: 'Ask the assistant with streaming responses (Server-Sent Events)',
  })
  @ApiBody({ type: ChatMessageDto })
  @ApiResponse({ status: 200, description: 'SSE stream of tokens' })
  async stream(
    @Body(new JoiValidationPipe(chatSchema)) dto: ChatMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable proxy buffering (Nginx etc.)
    res.flushHeaders?.();

    try {
      const prep = await this.ai.prepareConversation(dto);

      if (prep.noContext) {
        res.write(`data: ${JSON.stringify(prep.reply)}\n\n`);
        res.write(`event: done\ndata: ${JSON.stringify({ sessionId: prep.sessionId })}\n\n`);
        res.end();
        return;
      }

      let full = '';
      for await (const token of this.ai.streamChat(prep.messages!)) {
        full += token;
        res.write(`data: ${JSON.stringify(token)}\n\n`);
      }

      await this.ai.persist(prep.sessionId, dto.message, full);
      res.write(`event: done\ndata: ${JSON.stringify({ sessionId: prep.sessionId })}\n\n`);
    } catch (err) {
      this.logger.error(`AI stream failed: ${(err as Error)?.message}`, (err as Error)?.stack);
      const message =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error)?.message ||
        'The assistant is temporarily unavailable.';
      res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
    } finally {
      res.end();
    }
  }
}