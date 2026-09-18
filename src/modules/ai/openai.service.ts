import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

interface OpenAiConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
  temperature: number;
  maxTokens: number;
}

/** Re-exported for convenience so other modules use one message type. */
export type ChatMessageParam = OpenAI.Chat.ChatCompletionMessageParam;

/**
 * Thin wrapper around the official OpenAI SDK.
 *
 * - The API key is read from config (env) at construction and is never
 *   hardcoded or logged.
 * - When no key is configured the service fails fast with a clean,
 *   user-facing 503 so the chatbot degrades gracefully.
 * - SDK/HTTP errors are normalized into Nest HttpExceptions and logged.
 */
@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private readonly client: OpenAI;
  private readonly config: OpenAiConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<OpenAiConfig>('openai')!;
    this.client = new OpenAI({
      apiKey: this.config.apiKey || 'missing',
      baseURL: this.config.baseURL,
    });
  }

  private assertReady(): void {
    if (!this.config.apiKey) {
      throw new HttpException(
        'The AI assistant is temporarily unavailable. Please try again later.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /** Non-streaming completion. */
  async chat(messages: ChatMessageParam[]): Promise<string> {
    this.assertReady();
    try {
      const completion = await this.client.chat.completions.create({
        model: this.config.model,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });
      return completion.choices[0]?.message?.content?.trim() || '';
    } catch (err) {
      this.handleError(err);
    }
  }

  /** Streaming completion — yields content tokens as they arrive. */
  async *streamChat(messages: ChatMessageParam[]): AsyncGenerator<string> {
    this.assertReady();
    try {
      const stream = await this.client.chat.completions.create({
        model: this.config.model,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true,
      });
      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content;
        if (token) yield token;
      }
    } catch (err) {
      this.handleError(err);
    }
  }

  private handleError(err: unknown): never {
    const status = (err as { status?: number })?.status;
    const message =
      (err as { error?: { message?: string } })?.error?.message ||
      (err as Error)?.message ||
      'AI request failed';
    this.logger.error(`OpenAI request failed: ${message}`, (err as Error)?.stack);

    if (status === 401 || status === 403) {
      throw new HttpException(
        'The AI assistant is temporarily unavailable.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    if (status === 429) {
      throw new HttpException(
        'The assistant is busy right now. Please try again in a moment.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    throw new HttpException(
      'The assistant could not respond. Please try again.',
      HttpStatus.BAD_GATEWAY,
    );
  }
}
