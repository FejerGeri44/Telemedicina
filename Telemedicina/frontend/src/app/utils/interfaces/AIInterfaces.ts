export interface PatientAIConfig {
  meta: {
    audience: string;
    version: string;
    locale: string;
  };
  greeting: AIGreeting;
  intents: PatientAIIntent[];
  fallback: AIFallback;
}
export interface DoctorAIConfig {
  meta: {
    audience: string;
    version: string;
    locale: string;
  };
  greeting: AIGreeting;
  intents: DoctorAIIntent[];
  fallback: AIFallback;
}
export interface AIGreeting {
  quickStarts: QuickStart[];
  quickStartText: string;
}

export interface AIFallback {
  suggestions: Suggestion[];
  suggestionText: string;
}

export type PatientAIIntent = Intent;
export type DoctorAIIntent = Intent;

export interface Suggestion {
  id: number;
  icon: string;
  label: string;
  prompt: string;
  reply: string;
}

export interface DecomposedAIConfig {
  intents: PatientAIIntent[] | DoctorAIIntent[];
  greeting: AIGreeting;
  fallback: AIFallback;
}

export interface QuickStart {
  id: number;
  icon: string;
  label: string;
  prompt: string;
  reply: string;
}

export interface Intent {
  id: number;
  patterns: string[];
  response: string;
}
