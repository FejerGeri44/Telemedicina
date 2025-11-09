import type {
  AssistantConfig,
  AssistantDraft,
  AssistantRepository,
  FallbackSuggestion,
  Intent,
  ItemID,
  QuickStartItem,
} from './AIInterfaces';
import {makeRepository} from './Assistant.repository';

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function safeParse<T>(text: string | null): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

const hasLocalStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export class AssistantService {
  private repo: AssistantRepository;
  private draft?: AssistantConfig;
  private readonly storageKey: string;
  private loaded = false;

  private listeners = new Set<() => void>();

  constructor(filePath: string, bucket = 'chatbots') {
    this.repo = makeRepository(filePath, bucket);
    this.storageKey = `assistant-draft:${bucket}:${filePath}`;
  }

  static create(filePath: string, bucket?: string) {
    return new AssistantService(filePath, bucket);
  }

  async init(): Promise<void> {
    await this.repo.load();
    this.draft = this.repo.getSnapshot();

    if (hasLocalStorage) {
      const cached = safeParse<AssistantConfig>(
        window.localStorage.getItem(this.storageKey)
      );
      if (cached && cached.meta?.version === this.draft.meta?.version) {
        await this.repo.saveDraft(cached as AssistantDraft);
        this.draft = this.repo.getSnapshot();
      }
      this.persistDraft();
    }

    this.loaded = true;
    this.emit();
  }

  getDraft(): AssistantConfig {
    this.ensureLoaded();
    return deepClone(this.draft!);
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  unsubscribe(fn: () => void) {
    this.listeners.delete(fn);
  }
  private emit() {
    for (const fn of this.listeners) fn();
  }

  async saveDraft(patch: AssistantDraft): Promise<void> {
    this.ensureLoaded();
    await this.repo.saveDraft(patch);
    this.syncFromRepo();
  }

  resyncDraft(publishedConfig: AssistantConfig): void {
    this.ensureLoaded();
    this.repo.setOriginalAndDraft(publishedConfig);
    this.syncFromRepo();
  }

  async publish(): Promise<AssistantConfig> {
    this.ensureLoaded();
    const published = await this.repo.publish();
    this.draft = this.repo.getSnapshot();
    this.persistDraft();
    this.emit();
    return deepClone(published);
  }

  resetDraft(): void {
    this.ensureLoaded();
    this.repo.resetDraft();
    this.syncFromRepo();
  }

  async addQuickStart(item: QuickStartItem): Promise<void> {
    this.ensureLoaded();
    await this.repo.addQuickStart(item);
    this.syncFromRepo();
  }

  async updateQuickStart(id: ItemID, patch: Partial<QuickStartItem>): Promise<void> {
    this.ensureLoaded();
    await this.repo.updateQuickStart(id, patch);
    this.syncFromRepo();
  }

  async removeQuickStart(id: ItemID): Promise<void> {
    this.ensureLoaded();
    await this.repo.removeQuickStart(id);
    this.syncFromRepo();
  }

  async addIntent(item: Intent): Promise<void> {
    this.ensureLoaded();
    await this.repo.addIntent(item);
    this.syncFromRepo();
  }

  async updateIntent(id: ItemID, patch: Partial<Intent>): Promise<void> {
    this.ensureLoaded();
    await this.repo.updateIntent(id, patch);
    this.syncFromRepo();
  }

  async removeIntent(id: ItemID): Promise<void> {
    this.ensureLoaded();
    await this.repo.removeIntent(id);
    this.syncFromRepo();
  }

  async addFallbackSuggestion(item: FallbackSuggestion): Promise<void> {
    this.ensureLoaded();
    await this.repo.addFallbackSuggestion(item);
    this.syncFromRepo();
  }

  async updateFallbackSuggestion(
    id: ItemID,
    patch: Partial<FallbackSuggestion>
  ): Promise<void> {
    this.ensureLoaded();
    await this.repo.updateFallbackSuggestion(id, patch);
    this.syncFromRepo();
  }

  async removeFallbackSuggestion(id: ItemID): Promise<void> {
    this.ensureLoaded();
    await this.repo.removeFallbackSuggestion(id);
    this.syncFromRepo();
  }

  private syncFromRepo() {
    this.draft = this.repo.getSnapshot();
    this.persistDraft();
    this.emit();
  }

  private persistDraft() {
    if (!hasLocalStorage || !this.draft) return;
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(this.draft));
    } catch {
    }
  }

  private ensureLoaded(): void {
    if (!this.loaded || !this.draft) {
      throw new Error('Használat előtt hívd meg az init() metódust.');
    }
  }
}
