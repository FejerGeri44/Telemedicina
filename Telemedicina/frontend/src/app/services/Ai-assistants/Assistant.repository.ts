import {createClient, SupabaseClient, SupabaseClientOptions} from '@supabase/supabase-js';
import type {
  AssistantConfig,
  AssistantDraft,
  FallbackSuggestion,
  Intent,
  ItemID,
  QuickStartItem,
} from './AIInterfaces';
import {environment} from '../../../../enviroment';

function deepMerge<T>(target: T, patch: Partial<T>): T {
  if (patch === null || patch === undefined) return target;
  const out: any = Array.isArray(target) ? [...(target as any)] : { ...(target as any) };
  for (const [k, v] of Object.entries(patch as any)) {
    const curr = (out as any)[k];
    if (Array.isArray(v)) {
      (out as any)[k] = v.slice();
    } else if (v && typeof v === 'object' && curr && typeof curr === 'object' && !Array.isArray(curr)) {
      (out as any)[k] = deepMerge(curr, v as any);
    } else {
      (out as any)[k] = v;
    }
  }
  return out as T;
}

function replaceById<T extends { id: ItemID }>(list: T[], id: ItemID, patch: Partial<T>): T[] {
  let found = false;
  const next = list.map((x) => {
    if (String(x.id) === String(id)) {
      found = true;
      return { ...x, ...patch } as T;
    }
    return x;
  });
  if (!found) throw new Error(`Nincs elem ezzel az id-vel: ${id}`);
  return next;
}

function removeById<T extends { id: ItemID }>(list: T[], id: ItemID): T[] {
  const next = list.filter((x) => String(x.id) !== String(id));
  if (next.length === list.length) throw new Error(`Nincs elem ezzel az id-vel: ${id}`);
  return next;
}

interface SupabaseAssistantRepositoryOptions {
  supabaseUrl: string;
  supabaseKey: string;
  bucket: string;
  filePath: string;
}

export class SupabaseAssistantRepository {
  private client: SupabaseClient<any, 'public', any>;
  private bucket: string;
  private readonly filePath: string;
  private original?: AssistantConfig;
  private draft?: AssistantConfig;

  constructor(opts: SupabaseAssistantRepositoryOptions) {
    const options: SupabaseClientOptions<'public'> = {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    };
    this.client = createClient(opts.supabaseUrl, opts.supabaseKey, options);
    this.bucket = opts.bucket;
    this.filePath = opts.filePath;
  }

  async load(): Promise<AssistantConfig> {
    const { data, error } = await this.client.storage.from(this.bucket).download(this.filePath);
    if (error) throw new Error(`Storage download hiba: ${error.message}`);
    if (!data) throw new Error('Storage download hiba: üres válasz (data=null).');

    const text = await data.text();
    let parsed: AssistantConfig;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error('A letöltött fájl nem érvényes JSON.');
    }

    if (!parsed.meta || !parsed.greeting || !parsed.fallback || !Array.isArray(parsed.intents)) {
      throw new Error('A JSON szerkezete nem felel meg az AssistantConfig sémának.');
    }

    this.original = parsed;
    this.draft = JSON.parse(JSON.stringify(parsed));
    return parsed;
  }

  async saveDraft(patch: AssistantDraft): Promise<void> {
    this.ensureLoaded();
    this.draft = deepMerge(this.draft!, patch as any);
  }

  async publish(): Promise<AssistantConfig> {
    this.ensureLoaded();
    const body = JSON.stringify(this.draft!, null, 2);
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(this.filePath, new Blob([body], { type: 'application/json' }), {
        upsert: true,
        contentType: 'application/json',
      });
    if (error) throw new Error(`Storage upload hiba: ${error.message}`);

    this.original = JSON.parse(body);
    return this.original!;
  }

  async addQuickStart(item: QuickStartItem): Promise<void> {
    this.ensureLoaded();
    this.draft!.greeting.quickStarts = [...this.draft!.greeting.quickStarts, item];
  }

  async updateQuickStart(id: ItemID, patch: Partial<QuickStartItem>): Promise<void> {
    this.ensureLoaded();
    this.draft!.greeting.quickStarts = replaceById(this.draft!.greeting.quickStarts, id, patch);
  }

  async removeQuickStart(id: ItemID): Promise<void> {
    this.ensureLoaded();
    this.draft!.greeting.quickStarts = removeById(this.draft!.greeting.quickStarts, id);
  }

  async addIntent(item: Intent): Promise<void> {
    this.ensureLoaded();
    this.draft!.intents = [...this.draft!.intents, item];
  }

  async updateIntent(id: ItemID, patch: Partial<Intent>): Promise<void> {
    this.ensureLoaded();
    this.draft!.intents = replaceById(this.draft!.intents, id, patch);
  }

  async removeIntent(id: ItemID): Promise<void> {
    this.ensureLoaded();
    this.draft!.intents = removeById(this.draft!.intents, id);
  }

  async addFallbackSuggestion(item: FallbackSuggestion): Promise<void> {
    this.ensureLoaded();
    this.draft!.fallback.suggestions = [...this.draft!.fallback.suggestions, item];
  }

  async updateFallbackSuggestion(id: ItemID, patch: Partial<FallbackSuggestion>): Promise<void> {
    this.ensureLoaded();
    this.draft!.fallback.suggestions = replaceById(this.draft!.fallback.suggestions, id, patch);
  }

  async removeFallbackSuggestion(id: ItemID): Promise<void> {
    this.ensureLoaded();
    this.draft!.fallback.suggestions = removeById(this.draft!.fallback.suggestions, id);
  }

  getSnapshot(): AssistantConfig {
    this.ensureLoaded();
    return JSON.parse(JSON.stringify(this.draft!));
  }

  resetDraft(): void {
    this.ensureLoaded();
    this.draft = JSON.parse(JSON.stringify(this.original!));
  }

  public setOriginalAndDraft(config: AssistantConfig): void {
    this.original = config;
    this.draft = JSON.parse(JSON.stringify(config));
  }

  private ensureLoaded(): void {
    if (!this.draft || !this.original) {
      throw new Error('Használat előtt hívd meg a load() metódust.');
    }
  }
}

export function makeRepository(filePath: string, bucket = 'chatbots') {
  const supabaseUrl = environment.supabaseUrl;
  const supabaseKey = environment.supabaseAnonKey;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Hiányzik a SUPABASE URL vagy KEY (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY).');
  }
  return new SupabaseAssistantRepository({ supabaseUrl, supabaseKey, bucket, filePath });
}
