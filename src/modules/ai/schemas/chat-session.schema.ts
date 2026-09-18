import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AI_SESSION_TTL_SECONDS } from '../ai.constants';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessageRecord {
  role: ChatRole;
  content: string;
  createdAt: Date;
}

export type ChatSessionDocument = HydratedDocument<ChatSession>;

/**
 * A single conversation session for the AI assistant.
 *
 * - `sessionId` is an opaque UUID generated server-side (or supplied by the
 *   client to resume a session). It is the only thing persisted on the
 *   frontend, so conversations survive a page reload.
 * - `userId` is attached when the caller is authenticated (optional — the
 *   endpoint is @Public() so anonymous sessions are supported).
 * - `messages` stores the rolling transcript, trimmed to AI_HISTORY_LIMIT.
 * - A TTL index on `updatedAt` auto-expires idle sessions (no cron needed).
 */
@Schema({ timestamps: true, collection: 'chat_sessions' })
export class ChatSession {
  @Prop({ required: true, unique: true, index: true })
  sessionId: string;

  /** Null for anonymous visitors. */
  @Prop({ type: String, default: null, index: true })
  userId: string | null;

  @Prop({
    type: [
      {
        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  messages: ChatMessageRecord[];

  /**
   * Drives the TTL index. `timestamps: true` refreshes this on every save,
   * so a session is deleted AI_SESSION_TTL_SECONDS after its last activity.
   */
  @Prop({ type: Date, default: Date.now, expires: AI_SESSION_TTL_SECONDS })
  updatedAt: Date;
}

export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);