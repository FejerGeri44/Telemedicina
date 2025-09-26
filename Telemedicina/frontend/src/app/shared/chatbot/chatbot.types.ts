export type Audience = 'patient' | 'clinician';

export interface QuickStart { label: string; prompt: string; icon?: string; }

export type Pattern =
  | { type: 'keywords_any'; list: string[] }
  | { type: 'keywords_all'; list: string[] }
  | { type: 'regex'; pattern: string; flags?: string }
  | { type: 'startsWith'; text: string };

export interface ResponseBlock {
  text: string;
  suggestions?: string[];
  handoff?: 'assistant' | 'doctor' | 'emergency' | null;
}

export interface Intent {
  id: string;
  audience: Audience[];
  patterns: Pattern[];
  response: ResponseBlock;
  priority?: number;
  validFrom?: string;
  validUntil?: string;
}

export interface AssistantConfig {
  meta: { version: string; audience: Audience; locale?: string };
  greeting: { text: string; quickStarts: QuickStart[] };
  intents: Intent[];
  fallback: ResponseBlock;
}

export interface AssistantReply {
  intentId?: string;
  text: string;
  suggestions?: string[];
  handoff?: ResponseBlock['handoff'];
  confidence: number;
}
