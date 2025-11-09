export type ItemID = number | string;

export interface QuickStartItem {
  id: ItemID;
  icon: string;
  label: string;
  prompt: string;
  reply: string;
}

export interface GreetingConfig {
  quickStartText: string;
  quickStarts: QuickStartItem[];
}

export interface Intent {
  id: ItemID;
  patterns: string[];
  response: string;
}

export interface FallbackSuggestion extends QuickStartItem {}

export interface FallbackConfig {
  suggestionText: string;
  suggestions: FallbackSuggestion[];
}

export interface MetaConfig {
  version: string;
  audience: 'patient' | 'doctor';
  locale: string;
}

export interface AssistantConfig {
  meta: MetaConfig;
  greeting: GreetingConfig;
  intents: Intent[];
  fallback: FallbackConfig;
}

export type AssistantDraft = Partial<Omit<AssistantConfig, 'intents'>> & {
  intents?: Intent[];
};

export interface AssistantRepository {
  load(): Promise<AssistantConfig>;
  publish(): Promise<AssistantConfig>;
  saveDraft(patch: AssistantDraft): Promise<void>;
  setOriginalAndDraft(config: AssistantConfig): void;
  getSnapshot(): AssistantConfig;
  resetDraft(): void;

  addQuickStart(item: QuickStartItem): Promise<void>;
  updateQuickStart(id: ItemID, patch: Partial<QuickStartItem>): Promise<void>;
  removeQuickStart(id: ItemID): Promise<void>;

  addIntent(item: Intent): Promise<void>;
  updateIntent(id: ItemID, patch: Partial<Intent>): Promise<void>;
  removeIntent(id: ItemID): Promise<void>;

  addFallbackSuggestion(item: FallbackSuggestion): Promise<void>;
  updateFallbackSuggestion(id: ItemID, patch: Partial<FallbackSuggestion>): Promise<void>;
  removeFallbackSuggestion(id: ItemID): Promise<void>;
}
