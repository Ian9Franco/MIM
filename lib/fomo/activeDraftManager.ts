export type DraftItemPreview = {
  projectId: string;
  source: string;
  addedBy: string; // user ID
  username?: string;
  addedAt?: string;
};

export interface ActiveDraftState {
  id: string;
  name: string;
  loader: string;
  version: string;
  items: DraftItemPreview[];
}

type Subscriber = (state: ActiveDraftState | null) => void;

class ActiveDraftManager {
  private static instance: ActiveDraftManager;
  private state: ActiveDraftState | null = null;
  private subscribers: Set<Subscriber> = new Set();
  private readonly STORAGE_KEY = "mim_active_draft";

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): ActiveDraftManager {
    if (!ActiveDraftManager.instance) {
      ActiveDraftManager.instance = new ActiveDraftManager();
    }
    return ActiveDraftManager.instance;
  }

  private loadFromStorage() {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          this.state = JSON.parse(stored);
        }
      }
    } catch (e) {
      console.warn("Failed to load active draft from storage", e);
    }
  }

  private saveToStorage() {
    try {
      if (typeof window !== "undefined") {
        if (this.state) {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
        } else {
          localStorage.removeItem(this.STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn("Failed to save active draft to storage", e);
    }
  }

  private notify() {
    this.subscribers.forEach(sub => sub(this.state));
  }

  public subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    callback(this.state); // send initial state
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public getActiveDraft(): ActiveDraftState | null {
    return this.state;
  }

  public setActiveDraft(state: ActiveDraftState) {
    this.state = state;
    this.saveToStorage();
    this.notify();
  }

  public clearActiveDraft() {
    this.state = null;
    this.saveToStorage();
    this.notify();
  }

  public syncItems(items: DraftItemPreview[]) {
    if (this.state) {
      this.state.items = items;
      this.saveToStorage();
      this.notify();
    }
  }

  public addItem(item: DraftItemPreview) {
    if (this.state) {
      // Check if it already exists
      const idx = this.state.items.findIndex(i => i.projectId === item.projectId);
      if (idx >= 0) {
        this.state.items[idx] = { ...this.state.items[idx], ...item };
      } else {
        this.state.items.push(item);
      }
      this.saveToStorage();
      this.notify();
    }
  }

  public removeItem(projectId: string) {
    if (this.state) {
      this.state.items = this.state.items.filter(i => i.projectId !== projectId);
      this.saveToStorage();
      this.notify();
    }
  }

  public async validate(supabase: any) {
    if (!this.state) return;
    try {
      const { data, error } = await supabase
        .from("drafts")
        .select("id")
        .eq("id", this.state.id)
        .maybeSingle();

      if (error || !data) {
        console.warn("[ActiveDraftManager] Draft no longer exists or user lost access. Clearing.");
        this.clearActiveDraft();
      }
    } catch (e) {
      console.error("[ActiveDraftManager] Validation error", e);
    }
  }
}

export const activeDraftManager = ActiveDraftManager.getInstance();
