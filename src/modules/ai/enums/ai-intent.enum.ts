/**
 * Classifies an incoming message so we know whether to ground the answer in
 * live marketplace data (RAG) or answer as a general store assistant.
 */
export enum AiIntent {
  /** Asks about books, authors, prices, categories, sellers, or inventory. */
  MARKETPLACE = 'MARKETPLACE',
  /** General chit-chat, policies, or how-to questions. */
  GENERAL = 'GENERAL',
}