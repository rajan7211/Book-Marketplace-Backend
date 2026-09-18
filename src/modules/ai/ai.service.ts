import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { OpenAiService, ChatMessageParam } from './openai.service';
import { AiRetrievalService } from './ai-retrieval.service';
import { AiIntent } from './enums/ai-intent.enum';
import {
  AI_HISTORY_LIMIT,
  AI_MARKETPLACE_KEYWORDS,
  AI_NO_CONTEXT_MESSAGE,
  AI_SYSTEM_PROMPT_GENERAL,
  AI_SYSTEM_PROMPT_RAG,
} from './ai.constants';
import { ChatSession, ChatSessionDocument, ChatRole } from './schemas/chat-session.schema';
import { ChatMessageDto } from './dto/chat-message.dto';

export interface PreparedConversation {
  sessionId: string;
  /** Present when the LLM should be called. */
  messages?: ChatMessageParam[];
  /** True when we answered without calling the LLM (no marketplace data). */
  noContext?: boolean;
  reply?: string;
}

export interface ChatResult {
  reply: string;
  sessionId: string;
}

/**
 * Orchestrates the chat flow:
 *   classify intent → (RAG) retrieve marketplace data → load history →
 *   call OpenAI → persist the session.
 *
 * Conversation history is stored in MongoDB (ChatSession) with a TTL, so it
 * satisfies the "Redis or MongoDB" requirement without adding a Redis provider
 * (Redis is not wired in this project).
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly openAi: OpenAiService,
    private readonly retrieval: AiRetrievalService,
    @InjectModel(ChatSession.name) private readonly sessionModel: Model<ChatSessionDocument>,
  ) {}

  /** Non-streaming entry point. */
  async chat(dto: ChatMessageDto): Promise<ChatResult> {
    const prep = await this.prepareConversation(dto);
    if (prep.noContext) return { reply: prep.reply!, sessionId: prep.sessionId };
    const reply = await this.openAi.chat(prep.messages!);
    await this.persist(prep.sessionId, dto.message, reply);
    return { reply, sessionId: prep.sessionId };
  }

  /**
   * Shared orchestration used by both endpoints. For marketplace questions
   * with no retrieved data, returns `noContext` (and persists the canned
   * reply) so the caller never asks the LLM to invent an answer.
   */
  async prepareConversation(dto: ChatMessageDto): Promise<PreparedConversation> {
    const sessionId = dto.sessionId?.trim() || randomUUID();
    const intent = this.classify(dto.message);

    if (intent === AiIntent.MARKETPLACE) {
      const { context, hasData } = await this.retrieval.buildMarketplaceContext(dto.message);
      if (!hasData) {
        await this.persist(sessionId, dto.message, AI_NO_CONTEXT_MESSAGE);
        return { sessionId, noContext: true, reply: AI_NO_CONTEXT_MESSAGE };
      }
      const history = await this.loadHistory(sessionId);
      const messages = this.buildMessages(AI_SYSTEM_PROMPT_RAG, context, history, dto.message);
      return { sessionId, messages };
    }

    const history = await this.loadHistory(sessionId);
    const messages = this.buildMessages(AI_SYSTEM_PROMPT_GENERAL, '', history, dto.message);
    return { sessionId, messages };
  }

  /** Streaming entry point — yields tokens; the caller persists the full text. */
  streamChat(messages: ChatMessageParam[]): AsyncGenerator<string> {
    return this.openAi.streamChat(messages);
  }

  /** Persist the user message + assistant reply and trim history to the limit. */
  async persist(sessionId: string, userMessage: string, assistantReply: string): Promise<void> {
    try {
      await this.sessionModel.updateOne(
        { sessionId },
        {
          $setOnInsert: { sessionId },
          $push: {
            messages: {
              $each: [
                { role: 'user' as ChatRole, content: userMessage, createdAt: new Date() },
                { role: 'assistant' as ChatRole, content: assistantReply, createdAt: new Date() },
              ],
              $slice: -AI_HISTORY_LIMIT,
            },
          },
        },
        { upsert: true },
      );
    } catch (err) {
      // History is best-effort; never fail a chat reply because of it.
      this.logger.warn(`Failed to persist chat session ${sessionId}: ${(err as Error).message}`);
    }
  }

  private classify(message: string): AiIntent {
    const lower = (message || '').toLowerCase();
    if (AI_MARKETPLACE_KEYWORDS.some((k) => lower.includes(k))) return AiIntent.MARKETPLACE;
    return AiIntent.GENERAL;
  }

  private async loadHistory(sessionId: string): Promise<ChatMessageParam[]> {
    const session = await this.sessionModel.findOne({ sessionId }).lean().exec();
    if (!session?.messages?.length) return [];
    return session.messages
      .slice(-AI_HISTORY_LIMIT)
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }) as ChatMessageParam);
  }

  private buildMessages(
    systemPrompt: string,
    context: string,
    history: ChatMessageParam[],
    userMessage: string,
  ): ChatMessageParam[] {
    const messages: ChatMessageParam[] = [{ role: 'system', content: systemPrompt }];
    if (context) {
      messages.push({
        role: 'system',
        content: `Marketplace data (use ONLY this to answer):\n${context}`,
      });
    }
    for (const h of history) messages.push(h);
    messages.push({ role: 'user', content: userMessage });
    return messages;
  }
}