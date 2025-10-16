import {QuickStart, Suggestion} from '../../utils/interfaces/AIInterfaces';

export type Audience = 'patient' | 'doctor';

export interface Intent {
  id: number | string;
  patterns?: string[];
  response: string;
  priority?: number;
}

export interface ChatConfig {
  greeting?: {
    quickStartText?: string;
    quickStarts?: QuickStart[];
  };
  fallback?: {
    suggestionText?: string;
    suggestions?: Suggestion[];
  };
  intents?: Intent[];
}

export interface ChatMessage {
  who: 'user' | 'bot';
  text: string;
  ts?: number;
}

